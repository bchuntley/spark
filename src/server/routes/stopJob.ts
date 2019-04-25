import express from 'express';
import { SparkJob } from '../../models';
import spark from '../../spark';
import { logger } from '../../utils';
import { JobRunner } from '../../job';

const stopJob = async (req: express.Request, res: express.Response) => {
    const { job } = req.body as { job: SparkJob };

    try {
        logger.info(`Stopping job ${job.name}-${job.id}`);

        spark.queueStop(job);

        res.send({
            successful: true
        }).status(200);

    } catch (e) {
        logger.error(`Failed stopping job ${job.name}-${job.id}`, e);

        res.sendStatus(500);
    }

}

export default stopJob;
