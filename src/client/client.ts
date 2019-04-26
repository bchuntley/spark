import got from 'got';
import Table from 'cli-table';
import { logger, parseJSON } from '../utils';
import configPath from '../configPath';
import { Client, ServerState, SparkJob, JobLedgerEntry } from '../models';
import colors from 'colors';
import moment = require('moment');

class SparkClient {

    static config(): Client {
        return parseJSON(configPath);
    }

    static status = async () => {

        const { servers } = SparkClient.config();

        const table = new Table({
            head: [colors.cyan('Address'), colors.cyan('State'), colors.cyan('Status'), colors.cyan('Last Updated')],
            colWidths: [35, 10, 15, 25]
        })

        await Promise.all(servers.map(async (server) => {
            try {

                const res = await got.get(`${server}/_healthz`, { json: true, timeout: 5000 })

                let { address, state, lastUpdated } = (res as got.Response<any>).body;

                table.push([address, ServerState[state], colors.green('Healthy'), lastUpdated]);

            } catch (e) {
                table.push([server, colors.red('Dead'), colors.red('Unhealthy'), colors.red('Unknown')]);
            }
        }));

        logger.info(`\n${table.toString()}`);
    }

    static initJob = async (job: SparkJob) => {
        
        const { servers } = SparkClient.config();

        try {
            logger.info(`Deploying job`)

            await got.post(`${servers[0]}/initJob`, {
                json: true,
                body: job
            });
        } catch (e) {
            logger.error(`An error occured during job deployment`, e);
        }
    }

    static jobs = async () => {
        const { servers } = SparkClient.config();

        try {
            logger.info(`getting job stats`)

            const jobs =  await got.get(`${servers[0]}/getJobs`, {
                json: true
            });

            const table = new Table({
                head: [colors.cyan('ID'), colors.cyan('Name'), colors.cyan('Status'), colors.cyan('Desired'), colors.cyan('Last Updated')],
                colWidths: [10, 20, 15, 15, 25]
            });

            (jobs.body.jobs as any[]).forEach(job => {
                table.push([job.id, job.name, job.status, job.desired, job.lastUpdated]);
            })

            logger.info(`\n${table.toString()}`)
        } catch (e) {
            logger.info(`Error getting job stats`, e);
        }
    }

    static getJob = async (jobName: string) => {
        const { servers } = SparkClient.config();

        try {
            logger.info(`getting job stats`)

            const res =  await got.get(`${servers[0]}/getJob/${jobName}`, {
                json: true,
            });

            const job = res.body.job as JobLedgerEntry[]

            const latest = job.reduce((oldest, current) => {
                if (moment(oldest.lastUpdated).isBefore(moment(current.lastUpdated))) {
                    return current
                }
                return oldest;
            });

            const currentTable = new Table({
                head: ['Host'],
                colWidths: [32]
                
            });

            latest.hosts.map(host => {
                currentTable.push([host])
            });
            

            const table = new Table({
                head: [colors.cyan('ID'), colors.cyan('Status'), colors.cyan('Desired'), colors.cyan('Last Updated'), colors.cyan('Created')],
                colWidths: [10, 15, 15, 25, 25 ]
            });

            // job.forEach(entry => {
            //     if (entry.id !== latest.id) {
            //         table.push([entry.id, entry.status, entry.desired, entry.lastUpdated, entry.created]);
            //     }
            // });
            
            logger.info(`${jobName}\n${latest.id}\nCurrent Status: ${latest.status}\nDesired Status: ${latest.desired}\n\n${currentTable.toString()}\n\n${table.toString()}
            `)
        } catch (e) {
            logger.info(`Error getting job stats for ${jobName}`, e);
        }
    }
}

export default SparkClient;