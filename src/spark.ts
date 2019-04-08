import { logger } from './utils';
import Server from './server';
import { ServerConfig } from './models';

class Spark {
    sparkServer?: Server;

    init = async (serverConfig: ServerConfig) => {
        this.sparkServer = new Server(serverConfig);
        await this.sparkServer.init();
    }


}


const spark = new Spark();

export default spark;
