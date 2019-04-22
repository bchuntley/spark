import commander from 'commander';
import { logger, parseJSON } from '../utils';
import spark from '../spark';

const program = commander
    .parse(process.argv);

logger.info(`Kicking off a spark job `);


spark.initJob(program.args[0]);
