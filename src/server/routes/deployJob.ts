import express from 'express';
import JobRunner from '../../job/jobRunner';
import { SparkJob } from '../../models';
import spark from '../../spark';
import { logger } from 'utils';

const deployJob = async (req: express.Request, res: express.Response) => {

    const { job } = req.body as { job: SparkJob };

    const runner = new JobRunner(job);

    try {
        await runner.deployJob();

        res.sendStatus(200)

    } catch (e) {
        logger.error(`${job.name} failed while deploying to ${spark.sparkServer.hostName}:${spark.sparkServer.port}`, e);

        res.sendStatus(500);
    }
    
}

export default deployJob;
