import { logger, parseJSON } from '../utils';
import * as os from 'os';
import fs from 'fs';
import spark from '../spark';
import CONFIG_PATH from '../configPath';

const initClient = async (file: string) => {
    
    logger.info(`Initializing Spark client config`)
    const clientConfig = await parseJSON(file)

    clientConfig.type = 'client';
    await fs.writeFileSync(CONFIG_PATH, JSON.stringify(clientConfig, undefined, 2));

    logger.info(`Config written to ${CONFIG_PATH}`);
}

export default initClient;
