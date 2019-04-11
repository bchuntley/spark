import { logger } from './utils';
import Server from './server';
import { ServerConfig, ServerState } from './models';
import delay from 'delay';
import AbortController from 'abort-controller';

class Spark {
    sparkServer!: Server;
    clearSignal: AbortController;

    constructor() {
        this.clearSignal = new AbortController();
    }


    init = async (serverConfig: ServerConfig) => {
        logger.info(`Initializing spark server`);
        this.sparkServer = new Server(serverConfig);
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
                    this.sparkServer.state = ServerState.Leader;
                    this.sparkServer.leader = {
                        hostName: this.sparkServer.hostName
                    }
                    logger.info('Elected! Distrubitng updates!');
                    this.sparkServer.distributeUpdates();
                } else {
                    this.sparkServer.state = ServerState.Follower
                    await delay(this.sparkServer.health.max);
                    this.startElection();
                }
            });
        }
    }

    setLeaderTimeout = async () => {
        try {
            await delay(this.sparkServer.health.max, {signal: this.clearSignal.signal});
            logger.info(`Connection to leader at ${this.sparkServer.leader!.hostName} lost... Reelecting`);
            this.sparkServer.connectSiblings();
        } catch (e) {  } // Do nothing with this error, its intentional when we abort the promise.
    }

    clearLeaderTimeout = async () => {
        this.sparkServer.lock.acquire('lock', async () => {
            logger.info(`${this.sparkServer.hostName} connection to leader at ${this.sparkServer.leader!.hostName} reestablished`);
            this.clearSignal.abort();
            this.setLeaderTimeout();
        });

        
    }
}


const spark = new Spark();

export default spark;