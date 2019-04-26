interface SparkJob {
    id: string;
    name: string;
    image: string;
    tags: string[];
    desiredHosts: number;
    port: number;
    exposedPort: 'auto' | number;
    env: {
        [key: string]: string
    },
    address: string;
}

export default SparkJob;
