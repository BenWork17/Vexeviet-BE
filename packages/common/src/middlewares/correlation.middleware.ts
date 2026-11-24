import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { REQUEST_ID_HEADER, STATUS_TO_ERROR_CODE } from '../constants';
import { runWithRequestContext } from '../context/request-context';
import type { SharedAuthRequest } from '../types';

const SAFE_REQUEST_ID_RE = /^[a-zA-Z0-9._-]{4,128}$/;

export function normalizeIncomingRequestId(raw: string | string[] | undefined): string {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (candidate && SAFE_REQUEST_ID_RE.test(candidate)) {
    return candidate;
  }
  return randomUUID();
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Attaches X-Request-Id across AsyncLocalStorage + response header, and normalizes
 * any `{ success: false, ... }` JSON payload into the unified VeXeViet error envelope:
 * `{ success: false, error: { code, message, details? }, requestId }`.
 */
export type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;

export function createCorrelationMiddleware(serviceName?: string): ExpressMiddleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = normalizeIncomingRequestId(req.headers[REQUEST_ID_HEADER]);
    req.headers[REQUEST_ID_HEADER] = requestId;
    (req as SharedAuthRequest).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const originalJson = res.json.bind(res);
    res.json = ((body?: unknown): Response => {
      if (isPlainObject(body) && body.success === false) {
        const statusCode = res.statusCode >= 400 ? res.statusCode : 500;
        const defaultCode = STATUS_TO_ERROR_CODE[statusCode] || `HTTP_${statusCode}`;

        if (typeof body.error === 'string') {
          const code = typeof body.code === 'string' && body.code ? body.code : defaultCode;
          const normalized: Record<string, unknown> = {
            success: false,
            error: {
              code,
              message: body.error || 'Request failed',
              ...(body.details !== undefined ? { details: body.details } : {}),
              ...(process.env.NODE_ENV === 'development' && typeof body.stack === 'string'
                ? { stack: body.stack }
                : {}),
            },
            requestId: typeof body.requestId === 'string' ? body.requestId : requestId,
          };
          return originalJson(normalized);
        }

        if (isPlainObject(body.error)) {
          const inner = body.error;
          const code =
            typeof inner.code === 'string' && inner.code
              ? inner.code
              : typeof body.code === 'string' && body.code
              ? body.code
              : defaultCode;
          const message =
            typeof inner.message === 'string' && inner.message ? inner.message : 'Request failed';
          return originalJson({
            ...body,
            error: {
              ...inner,
              code,
              message,
            },
            requestId: typeof body.requestId === 'string' ? body.requestId : requestId,
          });
        }
      }

      return originalJson(body);
    }) as Response['json'];

    runWithRequestContext({ requestId, service: serviceName }, () => {
      next();
    });
  };
}

export const correlationMiddleware: ExpressMiddleware = createCorrelationMiddleware();
