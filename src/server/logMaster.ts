import moment from 'moment';
import uuid from 'uuid';
import { logger } from '../utils';
import { LogEvent } from '../models';

interface Log { 
    logId: string;
    timestamp: string;
    event: LogEvent;
    logText: string;
}

type Loggle = { [index: number]: Log};

class LogMaster {
    
    logs: Loggle;
    uncommitedLogs: Loggle;

    constructor() {
        this.logs = {};
        this.uncommitedLogs = {};
    }

    addLog(event: LogEvent, text: string) {
        const now = moment();
        const index = now.unix();

        const newLog = {
            logId: uuid.v4(),
            timestamp: now.format('lll'),
            event,
            logText: text
        }

        this.uncommitedLogs[index] = newLog;
        return {index, newLog};
    }

    get latestLog() {
        const latestKey: number = parseInt(Object.keys(this.logs)[Object.keys(this.logs).length - 1]);
        return this.logs[latestKey];
    }

    updateLogs(newLogs: Loggle) {
        this.uncommitedLogs = {...this.uncommitedLogs, ...newLogs};
        this.reconcileLogs();
    }

    reconcileLogs() {
        try {
            this.verifyLogs();
            this.logs = { ...this.logs, ...this.uncommitedLogs };
            this.uncommitedLogs = {};
        } catch (e) {
            logger.error('Collision in log indexes', e);
        }
    }

    verifyLogs() {
        const uncommitedIndexes = Object.keys(this.uncommitedLogs);
        uncommitedIndexes.forEach(uncommitedIndex => {
            if (this.logs[parseInt(uncommitedIndex)] !== undefined) {
                logger.error(`Collision at index ${uncommitedIndex} Overwriting.`);
            }
        });
    }
}

export default LogMaster;

