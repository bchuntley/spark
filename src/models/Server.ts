import { ConnectionStick } from "models";

export enum ServerState {
    Follower,
    Candidate,
    Leader
}

interface SparkServer {
    hostName: string;
    tags: string[];
    state: ServerState;
    siblings: SparkServer[];
    connections: ConnectionStick;
    leader?: SparkServer;
    health?: {
        min: number,
        max: number
    },
}

export default SparkServer