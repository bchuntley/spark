import { logger } from './utils';
import Server from './server';
import * as raft from './raft';
import { ServerConfig, ServerState } from './models';
import axios from 'axios';
import delay from 'delay';

const DELAY = 2500;

class Spark {
    sparkServer!: Server;
    raft!: {
        startElection: () => Promise<void>,
        leaderActive: boolean,
        changelog: raft.Changelog
    }

    constructor() {
        this.raft = {
            startElection: this.startElection,
            leaderActive: false,
            changelog: new raft.Changelog()
        }
    }


    init = async (serverConfig: ServerConfig) => {
        logger.info(`Initializing spark server`);

        this.sparkServer = new Server(serverConfig);

        await this.sparkServer.init();

        if (this.sparkServer.leader == undefined) {
            logger.info(`Starting election process`);
            this.startElection();
        } else {
            logger.info(`Starting leader timeout`);
            this.raft.leaderActive = true;
            this.leaderTimeout();
        }

    }

    startElection = async () => {
        while (this.sparkServer.leader == undefined) {
            logger.info(`Requesting votes`);
            const elected = await raft.startElection();

            if (elected == true) {
                logger.info(`Successfully elected as leader`);
                this.sparkServer.state = ServerState.Leader;
                break;
            }
        }

        logger.info(`Leader established`);

        if (this.sparkServer.state == ServerState.Leader) {
            logger.info(`Starting update distrubiton`);
            this.distributeUpdates();
        } else {
            logger.info(`Starting leader timeout`);
            this.leaderTimeout();
        }
    }

    leaderTimeout = async () => {
        await delay(DELAY * 2)

        if (this.raft.leaderActive) {
            logger.info(`Leader timeout reset`);
            this.leaderTimeout();
        } else {
            logger.info(`Leader timed out. Starting election process`);
            this.startElection();
        }

        this.raft.leaderActive = false;
    }

    distributeUpdates = async () => {

        logger.info('Distributing updates');

        await Promise.all(this.sparkServer.siblings.map(async sibling => {
            try {
                logger.info(`Sending update to ${sibling.hostName}`);

                await axios.post(`${sibling.hostName}/getUpdate`)
                logger.info(`Update sent succesfully to ${ sibling.hostName }`);
            } catch (e) {
                logger.error(`Follower unreachable at ${ sibling.hostName }`);
            }
        }));

        await delay(DELAY);

        this.distributeUpdates();
    }


}


const spark = new Spark();

export default spark;