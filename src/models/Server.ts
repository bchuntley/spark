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
    leader?: Partial<SparkServer>;
    health?: {
        min: number,
        max: number
    },
}

export default SparkServer