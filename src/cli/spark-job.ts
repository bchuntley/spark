import commander from 'commander';
import spark from '../spark';

const program = commander
    .parse(process.argv);

spark.job(program.args[0]);