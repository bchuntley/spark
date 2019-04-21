import express from 'express';
import spark from '../../spark';
import { logger } from '../../utils';
import { LogEvent } from '../';

const getUpdate = async (req: express.Request, res: express.Response) => {
    const logs = req.body.logs;
    try {
        spark.logMaster.updateLogs(logs);
        spark.logMaster.addLog(LogEvent.ReceiveUpdate, `Update received from ${spark.sparkServer.leader}`);
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