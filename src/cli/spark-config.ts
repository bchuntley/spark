#!/usr/bin/env node

import commander from 'commander';
import { logger } from '../utils';
import { initServer, initClient } from './index';

const program = commander
    .option('--server', 'Initialize a Spark Server')
    .option('--client', 'Initialize a Spark Client')
    .parse(process.argv);

if (program.args.length !== 1) {
    logger.error('Error parsing args!');
} else {
    if (program.server) {

        initServer(program.args[0]);

    } else if (program.client) {

        initClient(program.args[0]);

    } else {
        logger.error('You must specify which type of spark instance');
    }
}

