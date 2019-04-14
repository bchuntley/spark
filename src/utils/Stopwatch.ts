import delay from 'delay';
import AbortController from 'abort-controller';
import logger from './logger';

enum StopwatchState {
    RUNNING,
    STOPPED,
    COMPLETE
}

class Stopwatch {
    abort: AbortController;
    maxTime: number;
    state: StopwatchState;
    cb: () => any;


    constructor(time: number, cb: () => any) {
        this.maxTime = time;
        this.cb = cb;
        this.state = StopwatchState.STOPPED;
        this.abort = new AbortController();
    }

    start = async () => {
        this.state = StopwatchState.RUNNING;

        try {
            await delay(this.maxTime, { signal: this.abort.signal });
            logger.info('delay reached. running call back');
            await new Promise(async (resolve, reject) => {
                await this.cb();
                resolve();
            });
            this.state = StopwatchState.COMPLETE;
        } catch (e) { }
    }

    stop = async () => {
        this.state = StopwatchState.STOPPED;
        await this.abort.abort();
    }

    reset = () => {
        this.stop();
        this.abort = new AbortController();
        this.start();
    }
}

export default Stopwatch;