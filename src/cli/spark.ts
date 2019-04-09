#!/usr/bin/env node

import commander from 'commander';

const cli = commander
    .version(process.env.VERSION || '1.0.0')
    .command('init <path>', 'Initialize a spark server with a config file')
    .parse(process.argv);
