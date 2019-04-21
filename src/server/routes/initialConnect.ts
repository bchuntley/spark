import express from 'express';

import { logger } from '../../utils'
import spark from '../../spark';

const initialConnect = async (req: express.Request, res: express.Response) => {
    logger.info(`Connection request from ${req.body.host}`)
    await spark.sparkServer.lock.acquire("lock", async () => {
        logger.info(`Responding to ${req.body.host}`);

        if ( spark.sparkServer.leader ) {
            res.sendStatus(200);

            logger.info(`New host at ${req.body.host} added. Triggering reelection`);

        } else {
            const { hostName, leader, state, tags } = spark.sparkServer;

            res.send({
                server: {
                    hostName,
                    leader,
                    state,
                    tags
                }
            }).status(200);
            logger.info(`Successfully responded ${req.body.host}`);
        }

        
    });
}

export default initialConnect;