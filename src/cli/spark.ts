#!/usr/bin/env node

import commander from 'commander';

const cli = commander
    .version('1.0.0')
    .command('config <configFile>', 'Initialize a spark server with a config file')
    .command('start', 'Start a Spark Instance from the configuration')
    .command('run <job>', 'Run a Spark Job from a spark job file')
    .command('jobs', 'See the status of the spark jobs')
    .command('job <jobName>', 'See more detailed stats of a specific spark job')
    .command('status', 'See the status of the running Spark cluster')
    .parse(process.argv);
