import delay from 'delay';
import axios from 'axios';
import { ServerState } from '../models';
import spark from '../spark';
import {logger} from '../utils';

const startElection = async () => {
    
    const possibleVotes = spark.sparkServer.siblings.length + 1;
    
    const electionTimeout = Math.floor((Math.random() * 150) + 150);
    logger.info(`Election timeout set for ${electionTimeout}`);
    await delay(electionTimeout);
    spark.sparkServer.state = ServerState.Candidate;

    let votesReceived = 1;

    await Promise.all(spark.sparkServer.siblings.map(async sibling => {

        const {hostName, tags, state, port, siblings, connections, health} = spark.sparkServer;

        const res = await axios.post(`${sibling.hostName}/getVote`, {
            leader: {
                hostName,
                tags,
                state,
                port,
                siblings,
                connections,
                health,
            }
        });

        if (res.data.voted) {
            votesReceived += 1;
        }
    }));

    return votesReceived > (possibleVotes / 2);
}

export default startElection