import express from 'express';
import delay from 'delay';
import spark from '../../spark';
import { ServerState } from '../../models';
import { logger } from '../../utils';

const getVote = async (req: express.Request, res: express.Response) => {
    logger.info(`Vote requested from ${req.body.leader.hostName}`);

    if (!spark.sparkServer.leader) {
        spark.sparkServer.leader = req.body.leader;
        spark.sparkServer.state = ServerState.Follower;

        logger.info(`Voting for ${req.body.leader.hostName}`);

        res.send({
            voted: true
        }).status(200);
    } else {

        logger.info(`Already voted for ${spark.sparkServer.leader.hostName}`);

        res.send({
            voted: false
        }).status(200);
    }
}

export default getVote;