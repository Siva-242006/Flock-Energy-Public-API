import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'password',
      'email',
      '*.password',
      '*.email',
      'cookie',
      'headers.cookie',
      'headers.authorization',
      'headers["set-cookie"]',
      'session',
      'signingSecret',
      '*.signingSecret',
    ],
    censor: '[REDACTED]',
  },
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});
