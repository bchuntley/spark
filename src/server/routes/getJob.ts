import express from 'express';
import spark from '../../spark';
import { logger } from '../../utils';
import { ServerState } from '../../models';
import got from 'got';

const getJob = async (req: express.Request, res: express.Response) => {
    try {

        console.log(req.params.jobName);
        
        if (spark.sparkServer.state === ServerState.Leader) {
            const job = await spark.jobLedger.getJob(req.params.jobName);

            res.send({
                job
            })
        } else {
            const jobRes = await got.get(`http://${spark.sparkServer.leader!.hostName}/getJob/${req.params.jobName}`, {
                json: true
            })
            const job = jobRes.body.job;

            res.send({
                job
            });
        }
        
    } catch (e) {
        logger.error(`An error occured getting job stats`, e);
        res.sendStatus(500);
    }

}

export default getJob;
