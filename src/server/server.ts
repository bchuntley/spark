import express from 'express';
import got from 'got';
import delay from 'delay';
import { EventEmitter } from 'events';
import * as routes from './routes';
import { SparkServer, SparkJob, ServerState, ServerConfig, LogEvent } from "../models";
import { logger } from "../utils";
import lock from 'async-lock';
import spark from '../spark';
import { JobRunner } from '../job/';


class Server extends EventEmitter implements SparkServer {
    hostName: string;
    tags: string[];
    state: ServerState;
    siblings: SparkServer[];
    health: {
        max: number;
        min: number;
    };
    lock: lock;
    leader?: Partial<SparkServer>;
    port?: number;
    httpServer: express.Application;

    constructor(options: ServerConfig) {
        super();
        this.hostName = options.hostName || 'SparkServer';
        this.tags = options.tags || [];
        this.state = ServerState.Follower;
        this.port = options.port;
        this.siblings = options.siblings.map(siblingHost => {
            const server: SparkServer = {
                hostName: siblingHost,
                siblings: [],
                tags: [],
                state: ServerState.Follower,
            }
            return server;
        });
        this.lock = new lock();
        this.health = {
            max: options.healthCheck.maxHealthTime,
            min: options.healthCheck.minHealthTime
        };
        this.leader = undefined;
        this.httpServer = express();
        
        logger.info(`Initializing Spark Server on port ${this.port}`);

        this.httpServer.listen(this.port || 7654);
        this.httpServer.use(express.json());

        this.httpServer.get('/_healthz', routes.health);
        this.httpServer.get('/getJobs', routes.getJobs);
        this.httpServer.get('/getJob/:jobName', routes.getJob);
        this.httpServer.post('/initialConnect', routes.initialConnect);
        this.httpServer.post('/getVote', routes.getVote);
        this.httpServer.post('/getUpdate', routes.getUpdate);
        this.httpServer.post('/initJob', routes.initJob);
        this.httpServer.post('/runJob', routes.runJob);
        this.httpServer.post('/stopJob', routes.stopJob);
        
        
    }

    init = async () => {
        logger.info('Establishing connection to siblings...');
        this.connectSiblings();

        await this.lock.acquire("lock", async () => {
            await delay(this.health.min);
            logger.info("Initialized... Ready for connections");
        });
        
    }
    connectSiblings = async () => {
        await Promise.all(this.siblings.map(async (sibling, index) => {
            logger.info(`Attempting to connect to ${sibling.hostName}`);

            try {
                const res = await got.post(`${sibling.hostName}/initialConnect`, {
                    json: true,
                    body: {
                        "host": `${this.hostName}:${this.port}`
                    },
                    timeout: this.health.max
                });

                logger.info(`Sibling definition received ${JSON.stringify(res.body.server)}`);
            
                this.siblings[index].tags = res.body.server.tags;
                this.siblings[index].siblings = res.body.server.siblings;
            } catch (e) {
                logger.error(`Error initializing connection to ${sibling.hostName}`, e);
            }
        }));
    }

    requestVotes = async () => {
        let possibleVotes = 1;
        let totalVotes = 1;
        await Promise.all(this.siblings.map(async sibling => {

            logger.info(`Asking ${sibling.hostName} for their vote`);

            try {
                const res = await got.post(`${sibling.hostName}/getVote`, {
                    json: true,
                    timeout: this.health.max,
                    body: {
                        host: `${this.hostName}:${this.port}`,
                    }
                }); 
                possibleVotes++;

                if (res.body.voted) totalVotes++;

            } catch (e) {
                logger.error(`Host ${sibling.hostName} unreachable`, e);
            }
        }));

        return totalVotes >= (possibleVotes/2)
            
    }

    setLeader = async (leader: Partial<Server>) => {
        logger.info(`Leader set to ${leader.hostName}`);
        this.leader = leader
        this.state = ServerState.Follower
    }

    removeLeader = async () => {
        this.leader = undefined;
        this.state = ServerState.Follower;
    }

    distributeUpdates = async () => {
        let possibleUpdates = 0;
        let updatesReceived = 0;
        await Promise.all(this.siblings.map(async sibling => {
            try {
                const res = await got.post(`${sibling.hostName}/getUpdate`, {
                    body: {
                        logs: spark.logMaster.uncommitedLogs,
                        jobs: spark.jobLedger.jobs
                    },
                    timeout: this.health.max,
                    json: true
                });
                possibleUpdates++;

                if (res.body.updated) {
                    updatesReceived++;
                    logger.info(`${sibling.hostName} successfully pinged`);
                }
            } catch (e) {
                logger.error(`${sibling.hostName} unreachable for updates.`, e);

            }
            if(updatesReceived > (possibleUpdates/2)) {
                spark.logMaster.reconcileLogs();
            } else {
                throw new Error('Logs irreconciable with majority of hosts');
            }
        }));
    }

    startJob = async (job: SparkJob) => {
        if (this.state !== ServerState.Leader) {
            try {
                await got.post(`http://${this.leader!.hostName}/initJob`, {
                    json: true,
                    body: {
                        job
                    },
                    timeout: this.health.min
                });
            } catch (e) {
                logger.error(`Error while deploying job`, e);
            }
        } else {
            spark.logMaster.addLog(LogEvent.ReceiveJob, `Job received for ${job.name}`);
            spark.queueJob(job);
        }
    }

}

export default Server;
 