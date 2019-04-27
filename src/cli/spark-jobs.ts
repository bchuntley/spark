import spark from '../spark';
import { SparkClient } from '../client';

if (spark.client) {
    SparkClient.jobs();
} else {
    spark.jobs();
}