import express from 'express';
import spark from '../../spark';
import { logger }from '../../utils';

const getUpdate = async (req: express.Request, res: express.Response) => {
    await spark.clearLeaderTimeout();
    logger.info('Updated!');
    res.sendStatus(200);
}

export default getUpdate;