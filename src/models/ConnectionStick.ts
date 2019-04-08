import { SparkServer }from "models";

interface ConnectionStick {
    [source: string]: SparkServer
}

export default ConnectionStick;