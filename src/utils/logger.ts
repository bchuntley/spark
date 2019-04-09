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

logger.level == process.env.LOG_LEVEL || 'silly';

export default logger;