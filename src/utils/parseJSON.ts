import fs from "fs";
import { logger } from "../utils";

const parseJSON = async (path: string) => {

    const file = fs.readFileSync(path).toString();

    logger.silly(`File found -- ${file}`);

    let json;

    try {
        json = JSON.parse(file);

        logger.info(`Parsed JSON from file`);
    } catch (e) {
        logger.error(`An error occured while parsing ${path}`, e);
    }
    return json;
}

export default parseJSON;