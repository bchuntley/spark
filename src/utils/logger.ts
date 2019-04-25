import { createLogger, format, transports } from 'winston';

const logger = createLogger({
    format: format.combine(
        format.timestamp({
            format: 'HH:mm:ss YYYY-MM-DD'
        }),
        format.errors({ stack: true }),
        format.colorize(),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
        new transports.Console()
    ]
});

logger.level = 'silly';

export default logger;