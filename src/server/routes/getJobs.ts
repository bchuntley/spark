import express from 'express';
import spark from '../../spark';
import { logger } from '../../utils';
import { ServerState } from '../../models';
import got from 'got';

const getJobs = async (req: express.Request, res: express.Response) => {
    try {
        if (spark.sparkServer.state === ServerState.Leader) {
            const jobs = await spark.jobLedger.latestJobs();

            res.send({
                jobs
            })
        } else {
            const jobRes = await got.get(`http://${spark.sparkServer.leader!.hostName}/getJobs`, {
                json: true
            })
            const jobs = jobRes.body.jobs;

            res.send({
                jobs
            });
        }
        
    } catch (e) {
        logger.error(`An error occured getting job stats`, e);
        res.sendStatus(500);
    }

}

export default getJobs;
