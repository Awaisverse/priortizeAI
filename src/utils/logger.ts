import winston from 'winston';
import { config } from '../config';

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, module: mod, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${mod ?? 'app'}] ${level}: ${message}${metaStr}`;
  }),
);

export function createLogger(moduleName: string): winston.Logger {
  return winston.createLogger({
    level: config.logLevel,
    defaultMeta: { module: moduleName },
    transports: [
      new winston.transports.Console({
        format: config.env === 'development' ? devFormat : jsonFormat,
      }),
    ],
  });
}

export const logger = createLogger('app');
