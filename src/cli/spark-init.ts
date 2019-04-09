#!/usr/bin/env node

import commander from 'commander';
import { logger, parseJSON } from '../utils';
import spark from "../spark";

logger.info('Spark Server initialized...');

const execute = async (path: string) => {
    const config = await parseJSON(path);

    logger.info(JSON.stringify(config));

    await spark.init(config);
} 

const command = commander
    .parse(process.argv);


const path = command.args[0];

execute(path);