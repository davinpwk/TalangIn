import pino from 'pino';
import { config } from './config';

export const logger = pino(
  { level: config.logLevel },
  config.nodeEnv === 'development'
    ? pino.transport({ target: 'pino-pretty', options: { colorize: true } })
    : undefined
);
