import type { Request, Response, NextFunction } from 'express';
import { getRequestContext } from '../context/request-context';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'x-internal-api-key',
  'vnp_securehash',
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

export function createLogger(serviceName: string): Logger {
  const isProd = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  const emit = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
    if (isTest && level !== 'error') return;

    const ctx = getRequestContext();
    const requestId = ctx?.requestId;
    const timestamp = new Date().toISOString();
    const safeMeta = meta ? (redact(meta) as Record<string, unknown>) : undefined;

    if (isProd) {
      const record = JSON.stringify({
        timestamp,
        level,
        service: serviceName,
        ...(requestId ? { requestId } : {}),
        msg: message,
        ...(safeMeta || {}),
      });
      if (level === 'error') console.error(record);
      else if (level === 'warn') console.warn(record);
      else console.log(record);
      return;
    }

    const timeShort = timestamp.slice(11, 19);
    const reqTag = requestId ? ` [${requestId.slice(0, 8)}]` : '';
    const metaSuffix =
      safeMeta && Object.keys(safeMeta).length > 0 ? ` ${JSON.stringify(safeMeta)}` : '';
    const line = `${timeShort} ${level.toUpperCase().padEnd(5)} [${serviceName}]${reqTag} ${message}${metaSuffix}`;

    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  };

  return {
    debug: (msg, meta) => emit('debug', msg, meta),
    info: (msg, meta) => emit('info', msg, meta),
    warn: (msg, meta) => emit('warn', msg, meta),
    error: (msg, meta) => emit('error', msg, meta),
  };
}

export function createHttpLogger(
  serviceName: string
): (req: Request, res: Response, next: NextFunction) => void {
  const logger = createLogger(serviceName);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.path === '/health' || req.path === '/ready') {
      next();
      return;
    }

    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const msg = `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`;
      if (res.statusCode >= 500) logger.error(msg);
      else if (res.statusCode >= 400) logger.warn(msg);
      else logger.info(msg);
    });

    next();
  };
}
