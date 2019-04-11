import express from 'express';
import spark from '../../spark';
import { ServerState } from '../../models';
import { logger } from '../../utils';

const getVote = async (req: express.Request, res: express.Response) => {
    
    logger.info(`Vote request from ${req.body.host}`);

    logger.info(`Current leader: ${spark.sparkServer.leader ? spark.sparkServer.leader.hostName : "None"} Current state: ${ServerState[spark.sparkServer.state]}`);

    if (spark.sparkServer.state === ServerState.Follower && !spark.sparkServer.leader) {
        await spark.sparkServer.lock.acquire('lock', async () => {
            spark.sparkServer.leader = {
                hostName: req.body.host
            };

            logger.info(`Voted for ${req.body.host}`);

            res.send({voted: true}).status(200);
        });
    } else {
        
        logger.info(`Did not vote for ${req.body.host}`);

        res.send({voted: false}).status(200);
    }
}

export default getVote;