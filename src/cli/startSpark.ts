import { logger, parseJSON } from '../utils';
import CONFIG_PATH from '../configPath';
import spark from '../spark';

const startSpark = async (forcedConfig?: string) => {

    const config = await parseJSON(forcedConfig || CONFIG_PATH);

    if (config.type === 'client') {
        logger.error('Spark client already initialized and cannot be started');
        return;
    } 
    
    spark.init(config);
}

export default startSpark;
