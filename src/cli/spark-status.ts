import spark from '../spark';
import { SparkClient } from '../client';

if (spark.client) {
    SparkClient.status()
} else {
    spark.status()
}

