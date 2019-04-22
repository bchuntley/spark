
import commander from 'commander';
import { logger } from '../utils';
import { startSpark } from './index';

const program = commander
    .option('--force')
    .parse(process.argv)

logger.info(`Starting Spark Server`)

startSpark(program.args[0] || undefined);

