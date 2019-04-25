import { JobState } from './index';
import moment = require('moment');

export interface JobLedgerEntry {
    id: string,
    desired: JobState,
    status: JobState,
    hosts: string[],
    created: moment.Moment,
    lastUpdated: moment.Moment
}


interface JobLedger {
    jobs: {
        [jobName: string]: JobLedgerEntry[]
    }
}

export default JobLedger;
