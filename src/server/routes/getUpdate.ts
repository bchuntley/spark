import express from 'express';
import spark from '../../spark';
import { logger } from '../../utils';

const getUpdate = async (req: express.Request, res: express.Response) => {
    const logs = req.body.logs;
    try {
        spark.logMaster.updateLogs(logs);
        await spark.clearLeaderTimeout();
        logger.info('Updated!');
        res.send({
            updated: true
        });
    } catch (e) {
        res.send({
            updated: false
        });
    }
    
    
    
}

export default getUpdate;