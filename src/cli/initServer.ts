import { logger, parseJSON } from '../utils';
import * as os from 'os';
import fs from 'fs';
import spark from '../spark';
import CONFIG_PATH from '../configPath';

const initServer = async (file: string) => {

    logger.info(`Saving to ${CONFIG_PATH}`);
    const serverConfig = await parseJSON(file)

    serverConfig.type = 'server';

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(serverConfig, undefined, 2));

}

export default initServer;
