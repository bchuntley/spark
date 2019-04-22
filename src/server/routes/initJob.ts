import express from 'express';
import spark from '../../spark';
import { logger } from '../../utils';
import { SparkJob } from '../../models'

const initJob = async (req: express.Request, res: express.Response) => {
    spark.sparkServer.lock.acquire('lock', async () => {
        const { job } = (req.body as { job: SparkJob });
        logger.info(`Job request for ${job.name}`);

        try {
            await spark.sparkServer.startJob(job);
            res.send({
                msg: "Spark job started"
            }).status(200);
        } catch (e) {
            logger.error('Error occured while deploying job', e);
        }
    });
}

export default initJob;
