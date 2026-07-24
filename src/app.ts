import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './utils/logger';
import { requestIdMiddleware, RequestWithId } from './middleware/requestId';
import { ErrorMapper, NotFoundError } from './utils/ErrorMapper';

import healthRouter from './routes/health';
import metersRouter from './routes/meters';
import dtsRouter from './routes/dts';
import exportRouter from './routes/export';

import openapiDocument from './docs/openapi.json';

const app = express();

// Security Headers & CORS
app.use(helmet());
app.use(cors());

// Correlation ID & Structured Logging
app.use(requestIdMiddleware);
app.use(
  pinoHttp({
    logger,
    customProps: (req) => ({
      requestId: (req as RequestWithId).requestId,
    }),
  })
);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiter for Public APIs
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    error: {
      code: 'TOO_MANY_REQUESTS',
    },
  },
});

// Serve Raw OpenAPI Spec & Interactive Swagger UI
app.get('/openapi.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openapiDocument);
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

// Route Mounts
app.use('/health', healthRouter);
app.use('/api/v1/meters', limiter, metersRouter);
app.use('/api/v1/dts', limiter, dtsRouter);
app.use('/api/v1/export', limiter, exportRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  ErrorMapper.handle(new NotFoundError(`Route ${req.method} ${req.path} not found`), res, (req as RequestWithId).requestId);
});

// Global Error Handler
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  ErrorMapper.handle(err, res, (req as RequestWithId).requestId);
});

export default app;
