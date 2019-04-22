
import commander from 'commander';
import { logger } from '../utils';
import { startSpark } from './index';

const program = commander
    .option('--force')
    .parse(process.argv)

logger.info(`Starting Spark Server`)

if (program.force && program.args.length !== 1) {
    throw new Error('You must specify a forced config file!');
}

startSpark(program.force ? program.args[0] : undefined);

