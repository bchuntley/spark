import express from 'express';
import got from 'got';
import delay from 'delay';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import * as routes from './routes';
import { SparkServer, SparkJob, ConnectionStick, ServerState, ServerConfig } from "../models";
import { logger } from "../utils";


class Server extends EventEmitter implements SparkServer {
    hostName: string;
    tags: string[];
    state: ServerState;
    siblings: SparkServer[];
    connections: ConnectionStick;
    health: {
        max: number;
        min: number;
    };
    locked: boolean;
    leader?: SparkServer;
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
                tags: [],
                siblings: [],
                state: ServerState.Follower,
                connections: {}
            }
            return server;
        });
        this.locked = false;
        this.health = {
            max: options.healthCheck.maxHealthTime,
            min: options.healthCheck.minHealthTime
        };
        this.leader = undefined;
        this.httpServer = express();

        this.on('locked', this.lock);
        this.on('unlocked', this.unlock);
        
        logger.info(`Initializing Spark Server on port ${this.port}`);

        this.httpServer.listen(this.port || 7654);
        this.httpServer.use(express.json());

        this.httpServer.get('/_healthz', routes.health);
        this.httpServer.post('/initialConnect', routes.initialConnect);
        this.httpServer.post('/getVote', routes.getVote);
        this.httpServer.post('/getUpdate', routes.getUpdate);

        this.setMaxListeners(1);
    }

    init = async () => {
        logger.info('Establishing connection to siblings...');
        this.connectSiblings();
        this.emit('locked');
        await delay(this.health.min);
        this.emit('unlocked');
    }

    lock = () => {
        this.locked = true;
    }

    unlock = () => {
        this.locked = false;
    }

    getLock = async () => {
        if (this.locked) await new Promise(resolve => this.once('unlocked', resolve));
        this.emit('locked');
    }

    releaseLock = async () => {
        this.emit('unlocked');
    }

    connectSiblings = async () => {

        await Promise.all(this.siblings.map(async sibling => {
            logger.info(`Attempting to connect to ${sibling.hostName}`);

            try {
                const res = await got.post(`${sibling.hostName}/initialConnect`, {
                    json: true,
                    body: {
                        "host": `${this.hostName}:${this.port}`
                    },
                    timeout: this.health.max
                });

            } catch (e) {
                logger.error(`Error initializing connection to ${sibling.hostName}`);
            }
        }));
    }
}

export default Server;
 