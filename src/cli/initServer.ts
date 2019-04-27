import { logger, parseJSON } from '../utils';
import fs from 'fs';
import CONFIG_PATH from '../configPath';

const initServer = async (file: string) => {

    logger.info(`Initializing spark server config`);
    const serverConfig = await parseJSON(file)

    serverConfig.type = 'server';

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(serverConfig, undefined, 2));
    logger.info(`Config written to ${CONFIG_PATH}`);
}

export default initServer;
