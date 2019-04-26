import express from 'express';
import spark from '../../spark'

const reroute = async (req: express.Request, res: express.Response) => {


    if ( spark.client ) {
        res.status(301).redirect(`http://${spark.sparkServer.leader!.hostName!}`);
    } else {

        const latest = await spark.jobLedger.latestJobs()

        const entry = latest.filter(entry => {
            entry.job.address === req.hostname
        })[0];

        if (entry === undefined) {
            res.sendStatus(500);
            return;
        }

        const random = Math.floor(Math.random() * (entry.hosts.length - 1))

        res.status(301).redirect(entry.hosts[random]);
    }
}

