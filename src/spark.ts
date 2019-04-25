import { logger, parseJSON } from './utils';
import {Server, LogMaster} from './server';
import { ServerConfig, ServerState, SparkJob, LogEvent } from './models';
import { Stopwatch } from './utils'
import delay from 'delay';
import got from 'got';
import { JobLedger, JobRunner } from './job';
import Table from 'cli-table';
import colors from 'colors';
import { SparkClient } from './client';
import CONFIG_PATH from './configPath';

const HEARTBEAT = 3000;

class Spark {
    sparkServer!: Server;
    clearSignal: AbortController;
    leaderStopwatch: Stopwatch;
    logMaster: LogMaster;
    jobLedger: JobLedger;
    updateInterval?: NodeJS.Timeout;
    updates: any[];

    constructor() {
        this.logMaster = new LogMaster();
        this.jobLedger = new JobLedger();
        this.updates = [];
    }


    init = async (serverConfig: ServerConfig) => {
        this.sparkServer = new Server(serverConfig);
        this.leaderStopwatch = new Stopwatch(this.sparkServer.health.max, this.resetLeader);
        await this.sparkServer.init();
        this.startElection();

    }

    startElection = async () => {
        logger.info('Starting election timeout...');

        const electionTimeout = Math.floor((Math.random() * 300) + 0);

        await delay(electionTimeout);

        logger.info(`Waited for ${electionTimeout}ms`);

        await this.sparkServer.lock.acquire('lock', async () => {
            if (!this.sparkServer.leader && this.sparkServer.state == ServerState.Follower) {
                this.sparkServer.state = ServerState.Candidate;
            }
        });

        if (this.sparkServer.state === ServerState.Candidate) {
            const elected = await this.sparkServer.requestVotes();

            await this.sparkServer.lock.acquire('lock', async () => {
                
                if (elected) {
                    this.logMaster.addLog(LogEvent.Elect, `${this.sparkServer.hostName}:${this.sparkServer.port} elected`);
                    this.sparkServer.state = ServerState.Leader;
                    this.sparkServer.leader = {
                        hostName: this.sparkServer.hostName
                    }
                    logger.info('Elected! Distrubitng updates!');
                    this.startUpdates();
                } else {
                    this.logMaster.addLog(LogEvent.Elect, `${this.sparkServer.leader!.hostName} elected`);
                    this.sparkServer.state = ServerState.Follower;
                    this.leaderStopwatch.start();
                }
            });
        }
    }

    clearLeaderTimeout = async () => {
        await this.sparkServer.lock.acquire('lock', async () => {
            if (this.sparkServer.leader) {
                logger.info(`Heartbeat from ${this.sparkServer.leader.hostName}`);
            }
            await Promise.all(this.updates.map(async update => {
                await update();
            }));
            this.updates = [];
            this.leaderStopwatch.reset();
        });
    }

    resetLeader = async () => {
        await this.sparkServer.lock.acquire('lock', async () => {
            await this.sparkServer.removeLeader();
        });

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        await this.leaderStopwatch.stop();
        await this.startElection();
    }

    startUpdates = async () => {
        this.updateInterval = setInterval(async () => {
            try {
                await this.sparkServer.distributeUpdates();
                await Promise.all(this.updates.map(async update => {
                    await update();
                }));
                this.updates = [];
            } catch (e) {
                logger.error(e);
            }
            
        }, HEARTBEAT)
    }

    get client() {
        const config = this.config;
        return (config.type === 'client')
    }

    get config() {
        const config = parseJSON(CONFIG_PATH); 
        return config;
    }
    
    initJob = async (path: string) => {
        const job: SparkJob = parseJSON(path);

        if (this.client) {
            await got.post(`${this.config.servers[0]}/initJob`, {
                json: true,
                body: {
                    job
                }
            });

        } else {
            this.sparkServer.startJob(job);
        }
    }

    queueJob = async (job: SparkJob) => {

        this.updates.push(async () => {
            const jobRunner = new JobRunner(job);

            await jobRunner.kickOff();
        });
    }

    queueRun = async (job: SparkJob) => {
        this.updates.push(async () => {
            const runner = new JobRunner(job);
            await runner.runJob();
        });
    }

    status = async () => {

        if (this.client) {
            await SparkClient.status();
        } else {
            
            const hostAddress = `http://${this.sparkServer.hostName}:${this.sparkServer.port}`;

            const table = new Table({
                head: [colors.cyan('Address'), colors.cyan('State'), colors.cyan('Status'), colors.cyan('Last Updated')],
                colWidths: [35, 10, 15, 25]
            });

            await Promise.all([hostAddress, ...this.sparkServer.siblings].map(async server => {
                try {
                    const res = await got.get(`${server}/_healthz`, { json: true, timeout: 5000 })
                    let { address, state, lastUpdated } = (res as got.Response<any>).body;
                    table.push([address, ServerState[state], colors.green('Healthy'), lastUpdated]);
                } catch (e) {
                    table.push([server, colors.red('Dead'), colors.red('Unhealthy'), colors.red('Unknown')]);
                }

                logger.info(`\n${table.toString()}`);
            }));
        }
    }

    jobs = async () => {
        const jobs = await this.jobLedger.latestJobs();

    }
}


const spark = new Spark();

export default spark;