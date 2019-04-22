import express from 'express';
import spark from '../../spark';
import { logger } from '../../utils';

const health = (req: express.Request, res: express.Response) => {

    logger.info('Health request received');
    
    res.send({
        address: `${spark.sparkServer.hostName}:${spark.sparkServer.port}`,
        state: spark.sparkServer.state,
        lastUpdated: spark.logMaster.latestLog.timestamp
    }).status(200);

}

export default health;