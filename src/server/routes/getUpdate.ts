import express from 'express';
import spark from '../../spark';
import { logger }from '../../utils';

const getUpdate = (req: express.Request, res: express.Response) => {
    
    logger.info('Updated!');
    spark.raft.leaderActive = true;

}

export default getUpdate;