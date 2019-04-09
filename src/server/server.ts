import express from 'express';
import axios from 'axios';
import { logger } from "../utils";
import { SparkServer, SparkJob, ConnectionStick, ServerState, ServerConfig } from "../models";
import * as routes from './routes';
import delay from 'delay';

class Server implements SparkServer {
    hostName: string;
    tags: string[];
    state: ServerState;
    siblings: SparkServer[];
    connections: ConnectionStick;
    health: {
        max: number;
        min: number;
    };
    leader?: SparkServer;
    port?: number;
    httpServer: express.Application;

    constructor(options: ServerConfig) {
        this.hostName = options.hostName || 'SparkServer';
        this.tags = options.tags || [];
        this.state = ServerState.Follower;
        this.port = options.port;
        this.siblings = options.siblings.map(siblingHost => {
            const server: SparkServer = {
                hostName: siblingHost,
                tags: [],
                siblings: [],
                state: ServerState.Follower,
                connections: {}
            }
            return server;
        });
        this.connections = {};
        this.health = {
            max: options.healthCheck.maxHealthTime,
            min: options.healthCheck.minHealthTime
        };
        this.leader = undefined;

        this.httpServer = express();
    }

    init = async () => {
        console.log(this.port);
        
        logger.info(`Initializing Spark Server on port ${this.port}`);

        this.httpServer.listen(this.port || 7654);
        this.httpServer.use(express.json());

        this.httpServer.get('/_healthz', routes.health);
        this.httpServer.get('/initialConnect', routes.initialConnect);
        this.httpServer.post('/getVote', routes.getVote);
        this.httpServer.post('/getUpdate', routes.getUpdate);
        

        logger.info(`Spark server started`);

        logger.info('Establishing connection to siblings...');

        await this.connectSiblings();
    }

    connectSiblings = async () => {

        await Promise.all(this.siblings.map(async sibling => {

            const res = await this.establish(sibling);

            if(res) {
                logger.info(`Connected to ${sibling.hostName}`);

                if (res.data.server.leader) {
                    logger.info(`Leader found at ${res.data.server.leader.hostName}`);
                    this.leader = (res.data.server.state == ServerState.Leader) ? res.data.server : res.data.server.leader;
                    this.state = ServerState.Follower
                }
            } else {
                logger.error(`Unable to connect to ${sibling.hostName}`);
            }
        }));

    }

    establish = async (sibling: SparkServer) => {
        logger.silly(`Establishing connection to sibling at ${sibling.hostName}`);

        await delay(this.health.min);

        let res;

        try {
            res = await axios.get(`${sibling.hostName}/initialConnect`, { timeout: this.health.max })
        } catch (e) {
            logger.error(`${sibling.hostName}/initialConnect timed out after ${this.health.max}ms `, e);
            res = undefined;
        }

        return res;
    }

    heartbeat = async (sibling: SparkServer) => {

        logger.silly(`Pinging sibling located at ${sibling.hostName}`);

        await delay(this.health.min);

        let passed;

        try {
            passed = new Boolean(await axios.get(
                `${sibling.hostName}/_healthz`,
                { timeout: this.health.max }
            ));
        } catch (e) {
            logger.error(`${sibling.hostName} timed out after ${this.health.max}ms`);
            passed = false;
        }

        return passed;
    }


}

export default Server;
 