import { logger, parseJSON } from '../utils';
import * as os from 'os';
import fs from 'fs';
import spark from '../spark';
import CONFIG_PATH from '../configPath';

const initClient = async (file: string) => {
    
    logger.info(`Saving to ${CONFIG_PATH}`);
    const clientConfig = await parseJSON(file)

    clientConfig.type = 'client';

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(clientConfig, undefined, 2));

}

export default initClient;
