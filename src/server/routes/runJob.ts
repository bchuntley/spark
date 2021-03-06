import express from 'express';
import { SparkJob } from '../../models';
import spark from '../../spark';
import { logger } from '../../utils';

const runJob = async (req: express.Request, res: express.Response) => {
    const { job } = req.body as { job: SparkJob };

    try {
        spark.queueRun(job)
        
        res.send({
            successful: true
        }).status(200);

    } catch (e) {
        logger.error(`${job.name} failed while deploying to ${spark.sparkServer.hostName}:${spark.sparkServer.port}`, e);

        res.sendStatus(500);
    }

}

export default runJob;
