interface ServerConfig {
    hostName: string;
    siblings: string[];
    tags: string[];
    healthRoute: string;
    healthCheck: {
        maxHealthTime: number,
        minHealthTime: number
    }
    port: number;
}

export default ServerConfig;