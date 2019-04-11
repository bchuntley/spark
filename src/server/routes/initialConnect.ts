import express from 'express';

import { logger } from '../../utils'
import spark from '../../spark';

const initialConnect = async (req: express.Request, res: express.Response) => {
    logger.info(`Connection request from ${req.body.host}`)
    await spark.sparkServer.getLock();

    logger.info(`Responding to ${req.body.host}`);

    const { hostName, tags, state, port, siblings, connections, health, leader } = spark.sparkServer;

    res.send({
        server: {
            hostName, 
            tags, 
            state, 
            port, 
            siblings, 
            connections, 
            health, 
            leader
        }
    }).status(200);
    logger.info(`Successfully responded ${req.body.host}`);
    await spark.sparkServer.releaseLock();
}

export default initialConnect;