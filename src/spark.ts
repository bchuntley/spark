import { logger } from './utils';
import {Server, LogMaster, LogEvent} from './server';
import { ServerConfig, ServerState } from './models';
import delay from 'delay';
import { Stopwatch } from './utils'

const HEARTBEAT = 3000;

class Spark {
    sparkServer!: Server;
    clearSignal: AbortController;
    leaderStopwatch: Stopwatch;
    logMaster: LogMaster;
    updateInterval?: NodeJS.Timeout;

    constructor() {
        this.logMaster = new LogMaster();
    }


    init = async (serverConfig: ServerConfig) => {
        logger.info(`Initializing spark server`);
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
            } catch (e) {
                logger.error(e);
                
            }
            
        }, HEARTBEAT)
    }
    
}


const spark = new Spark();

export default spark;