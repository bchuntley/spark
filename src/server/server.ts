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
        this.state = ServerState.Candidate;
        this.port = options.port;
        this.siblings = options.siblings.map(siblingHost => {
            const server: SparkServer = {
                hostName: siblingHost,
                tags: [],
                siblings: [],
                state: ServerState.Candidate,
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

        this.httpServer.use('/_healthz', routes.health);

        logger.info(`Spark server started`);

        logger.info('Establishing connection to siblings...');

        await this.connectSiblings();
    }

    connectSiblings = async () => {

        await Promise.all(this.siblings.map(async sibling => {

            const res = await this.heartbeat(sibling);

            if(res) {
                logger.info(`Connected to ${sibling.hostName}`);
            } else {
                logger.info(`Unable to connect to ${sibling.hostName}`);
            }
        }));

    }

    heartbeat = async (sibling: SparkServer) => {

        logger.silly(`Pinging sibling located at ${sibling.hostName}`);

        await delay(this.health.min);

        let passed;

        try {
            passed = new Boolean(await axios.get(
                `http://${sibling.hostName}/_healthz`,
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
 