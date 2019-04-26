import { JobState, IJobLedger, JobLedgerEntry } from '../models';
import uuid from 'uuid';
import moment = require('moment');
import lock from 'async-lock';
import { logger } from '../utils';

class JobLedger implements IJobLedger {
    jobs: {
        [jobName: string]: JobLedgerEntry[]
    }
    lock: lock;

    constructor() {
        this.jobs = {};
        this.lock = new lock()
    }

    latestJobs = async () => {
        logger.silly('latest jobs');

        const latest = await this.lock.acquire('lock', async () => {
            const keys = Object.keys(this.jobs).map(jobKey => {
                const entries = this.jobs[jobKey];
                entries.reduce((earliestEntry, currEntry) => {
                    if((currEntry.status !== JobState.Completed || currEntry.desired !== JobState.Completed) && earliestEntry.lastUpdated.isBefore(currEntry.lastUpdated)) {
                        return currEntry;
                    } else {
                        return earliestEntry;
                    }
                });
                const latest = entries[0]
                return {
                    ...latest,
                    name: jobKey,
                    created: latest.created.format('lll'),
                    lastUpdated: latest.lastUpdated.format('lll'),
                    status: JobState[latest.status],
                    desired: JobState[latest.desired],
                }
            });
            return keys;   
        });
        return latest;
    }

    getJob = async (jobName: string) => {
        const job = await this.lock.acquire('lock', () => {
            const entries = this.jobs[jobName];

            return entries;
        });

        return job;
    }

    getRunning = async (jobName: string) =>  {
        logger.silly('get running');

        let running = await this.lock.acquire('lock', () => {
            const entries = this.jobs[jobName];

            for (let entry of entries) {
                if (entry.status === JobState.Running) {
                    return entry;
                }
            }
        });

        logger.silly(`${JSON.stringify(running, null, 2)}`);

        return running;
        
    }

    getCompleting = async (jobName: string) => {
        logger.silly(`get completing`);
        let completing = await this.getRunning(jobName);
        if (completing && completing.desired === JobState.Completed) return completing;
    }

    getEntryId (jobName: string, entryId: string) {
        const entries = this.jobs[jobName];

        if (!entries) return undefined;

        return entries.filter(entry => entry.id === entryId)[0];
    }

    stopJob = async (jobName: string) => {
        logger.silly(`stop job`);

        await this.lock.acquire('lock', async () => {
            const entries = this.jobs[jobName];

            for (let entry of entries) {
                if (entry!.status === JobState.Running) {
                    logger.silly(`updating entry entry ${JSON.stringify(entry, null, 2)} to desired Completed state`)
                    entry.desired = JobState.Completed;
                    entry.lastUpdated = moment();
                    break;
                }
            }
        });
    }

    createJob = async (jobName: string, hosts: string[]) => {
        logger.silly(`creating job ${jobName} on ${JSON.stringify(hosts, null, 2)}`);
        if (!this.jobs[jobName]) {
            this.jobs[jobName] = [];
        } else {
            await this.stopJob(jobName);
        }

        let newJob = await this.lock.acquire('lock', async () => {
            const entries = this.jobs[jobName];

            const now = moment();

            const newJob = {
                id: uuid.v4(),
                desired: JobState.Running,
                status: JobState.Received,
                hosts,
                created: now,
                lastUpdated: now
            }
            logger.silly(`new Job ${JSON.stringify(newJob)}`);

            entries.push(newJob);
            return newJob;
        });

        return newJob;
    }

    startJob = async (jobName: string) => {
        logger.silly('start job')
        await this.lock.acquire('lock', async () => {
            const entries = this.jobs[jobName];

            for (let entry of entries) {
                if (entry.desired === JobState.Completed) {
                    logger.silly(`start entry --completed ${entry}`);
                    entry.status = JobState.Completed;
                    entry.lastUpdated = moment();
                } else if (entry.desired === JobState.Running) {
                    logger.silly(`start entry --running ${entry}`);
                    entry.status = JobState.Running;
                    entry.lastUpdated = moment();
                }
            }
        });
    }
}

export default JobLedger
