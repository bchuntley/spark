import commander from 'commander';
import spark from '../spark';
import { SparkClient } from '../client';

const program = commander
    .parse(process.argv);


if (spark.client) {
    SparkClient.getJob(program.args[0]);
}