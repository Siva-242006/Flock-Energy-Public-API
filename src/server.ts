// Allow connections to legacy hosts with self-signed SSL certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Urja Meter Ops API Wrapper running on http://localhost:${env.PORT}`);
  logger.info(`📚 Swagger UI documentation available at http://localhost:${env.PORT}/docs`);
  logger.info(`📄 OpenAPI JSON spec available at http://localhost:${env.PORT}/openapi.json`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});
