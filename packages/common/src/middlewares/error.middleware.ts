import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { STATUS_TO_ERROR_CODE } from '../constants';
import { getRequestId } from '../context/request-context';
import { createLogger } from '../logger';

export interface ErrorLike extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export type ExpressErrorMiddleware = (
  err: ErrorLike,
  req: Request,
  res: Response,
  next: NextFunction
) => void;

export function createErrorHandler(serviceName = 'service'): ExpressErrorMiddleware {
  const logger = createLogger(serviceName);

  return (err: ErrorLike, req: Request, res: Response, _next: NextFunction): void => {
    const requestId = getRequestId();

    if (err instanceof ZodError) {
      const details = err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      logger.warn(`Validation error on ${req.method} ${req.originalUrl}`, { details });
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: details[0]?.message || 'Invalid request data',
          details,
        },
        requestId,
      });
      return;
    }

    // Prisma known request errors (P2002 unique constraint, P2025 record not found)
    if (err.code === 'P2002') {
      logger.warn(`Unique constraint conflict on ${req.method} ${req.originalUrl}`, {
        code: err.code,
      });
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists',
        },
        requestId,
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Requested record not found',
        },
        requestId,
      });
      return;
    }

    const statusCode =
      typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : 500;
    const code =
      typeof err.code === 'string' && err.code && !err.code.startsWith('P2')
        ? err.code
        : STATUS_TO_ERROR_CODE[statusCode] || 'INTERNAL_SERVER_ERROR';
    const message =
      statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'An unexpected error occurred';

    if (statusCode >= 500) {
      logger.error(`${code}: ${err.message}`, {
        path: req.originalUrl,
        method: req.method,
        stack: err.stack,
      });
    } else {
      logger.warn(`${code}: ${err.message}`, {
        path: req.originalUrl,
        method: req.method,
      });
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(err.details !== undefined ? { details: err.details } : {}),
        ...(process.env.NODE_ENV === 'development' && err.stack ? { stack: err.stack } : {}),
      },
      requestId,
    });
  };
}

export const errorHandler: ExpressErrorMiddleware = createErrorHandler('vexeviet');

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    requestId: getRequestId(),
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
