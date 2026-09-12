import { Response } from 'express';
import { ZodError } from 'zod';
import { AxiosError } from 'axios';
import { UpstreamAuthenticationError } from '../legacy/session';
import { StandardErrorResponse } from '../dto/public';
import { logger } from './logger';

export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_SERVER_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', errorCode: string = 'RESOURCE_NOT_FOUND') {
    super(message, 404, errorCode);
    this.name = 'NotFoundError';
  }
}

export class ErrorMapper {
  public static handle(error: unknown, res: Response, requestId?: string): Response {
    logger.error({ error, requestId }, 'ErrorMapper handling request exception');

    // 1. Zod Validation Error
    if (error instanceof ZodError) {
      const payload: StandardErrorResponse = {
        success: false,
        message: 'Invalid request parameters',
        error: {
          code: 'INVALID_PARAMETERS',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      };
      return res.status(400).json(payload);
    }

    // 2. Explicit App Error (e.g. NotFoundError)
    if (error instanceof AppError) {
      const payload: StandardErrorResponse = {
        success: false,
        message: error.message,
        error: {
          code: error.errorCode,
        },
      };
      return res.status(error.statusCode).json(payload);
    }

    // 3. Upstream Authentication Error
    if (error instanceof UpstreamAuthenticationError) {
      const payload: StandardErrorResponse = {
        success: false,
        message: 'Failed to authenticate with legacy backend system',
        error: {
          code: 'UPSTREAM_AUTH_FAILED',
        },
      };
      return res.status(502).json(payload);
    }

    // 4. Axios Upstream Error
    if (error && typeof error === 'object' && 'isAxiosError' in error) {
      const axiosErr = error as AxiosError;

      // Timeout check
      if (
        axiosErr.code === 'ECONNABORTED' ||
        axiosErr.code === 'ETIMEDOUT' ||
        axiosErr.message.includes('timeout')
      ) {
        const payload: StandardErrorResponse = {
          success: false,
          message: 'Upstream legacy service timed out',
          error: {
            code: 'UPSTREAM_TIMEOUT',
          },
        };
        return res.status(504).json(payload);
      }

      // Legacy 404
      if (axiosErr.response?.status === 404) {
        const payload: StandardErrorResponse = {
          success: false,
          message: 'Target resource not found on legacy system',
          error: {
            code: 'RESOURCE_NOT_FOUND',
          },
        };
        return res.status(404).json(payload);
      }

      // Generic Upstream Failure
      const payload: StandardErrorResponse = {
        success: false,
        message: 'Upstream legacy service communication error',
        error: {
          code: 'UPSTREAM_SERVICE_ERROR',
        },
      };
      return res.status(502).json(payload);
    }

    // 5. Fallback Internal Server Error
    const fallbackMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    logger.error({ error, fallbackMessage, requestId }, 'Unhandled fallback internal server error');
    const payload: StandardErrorResponse = {
      success: false,
      message: 'Internal server error',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
      },
    };
    return res.status(500).json(payload);
  }
}
