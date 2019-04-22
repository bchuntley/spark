import got from 'got';
import Table from 'cli-table';
import { logger, parseJSON } from '../utils';
import configPath from '../configPath';
import { Client, ServerState } from '../models';
import colors from 'colors';

class SparkClient {

    static config(): Client {
        return parseJSON(configPath);
    }

    static status = async () => {

        const { servers } = SparkClient.config();

        const table = new Table({
            head: [colors.cyan('Address'), colors.cyan('State'), colors.cyan('Status'), colors.cyan('Last Updated')],
            colWidths: [35, 10, 15, 25]
        })

        await Promise.all(servers.map(async (server) => {
            try {

                const res = await got.get(`${server}/_healthz`, { json: true, timeout: 5000 })

                let { address, state, lastUpdated } = (res as got.Response<any>).body;

                table.push([address, ServerState[state], colors.green('Healthy'), lastUpdated]);

            } catch (e) {
                table.push([server, colors.red('Dead'), colors.red('Unhealthy'), colors.red('Unknown')]);
            }

            
        })); 

        logger.info(`\n${table.toString()}`);
    }
}

export default SparkClient;