#!/usr/bin/env node

import commander from 'commander';

const cli = commander
    .version('1.0.0')
    .command('config <configFile>', 'Initialize a spark server with a config file')
    .command('start', 'Start a Spark Instance from the configuration')
    .command('run <job>', 'Run a Spark Job from a spark job file')
    .parse(process.argv);
