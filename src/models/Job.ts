interface SparkJob {
    id: string;
    name: string;
    image: string;
    tags: string[];
    desiredHosts: number;
    port: number;
    protocol: "http" | "https";
    exposedPort: 'auto' | number;
    env: {
        [key: string]: string
    }
}

export default SparkJob;
