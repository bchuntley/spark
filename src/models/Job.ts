interface SparkJob {
    name: string;
    dockerImage: string;
    tags: string[];
    desiredHosts: number;
    env: {
        [key: string]: string
    }
}

export default SparkJob;
