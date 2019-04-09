import express from 'express';
import delay from 'delay';
import spark from '../../spark';

const initialConnect = async (req: express.Request, res: express.Response) => {

    await delay(spark.sparkServer.health.min);

    const { hostName, tags, state, port, siblings, connections, health, leader } = spark.sparkServer;

    res.send({
        server: {
            hostName, 
            tags, 
            state, 
            port, 
            siblings, 
            connections, 
            health, 
            leader
        }
    }).status(200);

    
}

export default initialConnect;