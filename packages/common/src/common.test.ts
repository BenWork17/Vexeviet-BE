import assert from 'node:assert/strict';
import test from 'node:test';
import zlib from 'node:zlib';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { config } from '@vexeviet/config';
import {
  authMiddleware,
  createCorrelationMiddleware,
  createErrorHandler,
  createJsonCompressionMiddleware,
  NotFoundError,
  validateBody,
} from './index';

function createMockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let jsonBody: unknown;

  const res = {
    get statusCode() {
      return statusCode;
    },
    setHeader(key: string, val: string) {
      headers[key.toLowerCase()] = val;
      return res;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(body: unknown) {
      jsonBody = body;
      return res;
    },
  };

  return {
    res: res as unknown as Response,
    getHeaders: () => headers,
    getStatus: () => statusCode,
    getBody: () => jsonBody as Record<string, unknown>,
  };
}

test('correlationMiddleware attaches X-Request-Id and upgrades flat string error responses', () => {
  const mw = createCorrelationMiddleware('test-svc');
  const req = { headers: { 'x-request-id': 'req-custom-1234' } } as unknown as Request;
  const mock = createMockRes();

  mw(req, mock.res, () => {
    mock.res.status(400).json({ success: false, error: 'Legacy string error' });
  });

  assert.equal(mock.getHeaders()['x-request-id'], 'req-custom-1234');
  assert.deepEqual(mock.getBody(), {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Legacy string error',
    },
    requestId: 'req-custom-1234',
  });
});

test('errorHandler formats AppError subclasses into unified envelope with requestId', () => {
  const mw = createCorrelationMiddleware('test-svc');
  const handler = createErrorHandler('test-svc');
  const req = {
    method: 'GET',
    originalUrl: '/api/v1/routes/999',
    headers: { 'x-request-id': 'req-err-9999' },
  } as unknown as Request;
  const mock = createMockRes();

  mw(req, mock.res, () => {
    handler(new NotFoundError('Route', '999'), req, mock.res, () => {});
  });

  assert.equal(mock.getStatus(), 404);
  const body = mock.getBody();
  assert.equal(body.success, false);
  assert.equal(body.requestId, 'req-err-9999');
  assert.equal((body.error as Record<string, unknown>).code, 'NOT_FOUND');
});

test('authMiddleware verifies JWT using shared @vexeviet/config secret', () => {
  const token = jwt.sign(
    { userId: 'u-1', email: 'test@vexeviet.com', role: 'CUSTOMER' },
    config.jwt.secret,
    { expiresIn: '5m' }
  );

  const req = {
    headers: { authorization: `Bearer ${token}` },
  } as unknown as Request & { user?: unknown };
  const mock = createMockRes();
  let forwardedErr: unknown = null;

  authMiddleware(req, mock.res, (err?: unknown) => {
    forwardedErr = err ?? null;
  });

  assert.equal(forwardedErr, null);
  assert.equal((req.user as { userId: string }).userId, 'u-1');
});

test('validateBody rejects invalid payload with structured VALIDATION_ERROR details', () => {
  const schema = z.object({ email: z.string().email() });
  const mw = validateBody(schema);
  const req = { body: { email: 'not-an-email' } } as unknown as Request;
  const mock = createMockRes();
  let capturedErr: unknown;

  mw(req, mock.res, (err?: unknown) => {
    capturedErr = err;
  });

  assert.ok(capturedErr instanceof Error);
  assert.equal((capturedErr as { code?: string }).code, 'VALIDATION_ERROR');
});

test('createJsonCompressionMiddleware gzips large JSON payloads and composes with correlationMiddleware', () => {
  const compressMw = createJsonCompressionMiddleware(128);
  const correlationMw = createCorrelationMiddleware('test-svc');
  const req = {
    headers: { 'accept-encoding': 'gzip, deflate, br', 'x-request-id': 'req-gzip-1' },
  } as unknown as Request;

  const headers: Record<string, string> = {};
  let rawBuffer: Buffer | null = null;
  const res = {
    headersSent: false,
    setHeader(k: string, v: string) {
      headers[k.toLowerCase()] = v;
      return res;
    },
    getHeader(k: string) {
      return headers[k.toLowerCase()];
    },
    vary(field: string) {
      headers.vary = field;
      return res;
    },
    status() {
      return res;
    },
    json(body: unknown) {
      rawBuffer = Buffer.from(JSON.stringify(body), 'utf8');
      return res;
    },
    send(buf: Buffer) {
      rawBuffer = buf;
      return res;
    },
  } as unknown as Response;

  compressMw(req, res, () => {
    correlationMw(req, res, () => {
      res.json({ success: true, items: Array.from({ length: 30 }, (_, i) => `route-item-${i}`) });
    });
  });

  assert.equal(headers['content-encoding'], 'gzip');
  assert.ok(rawBuffer instanceof Buffer);
  const decoded = JSON.parse(zlib.gunzipSync(rawBuffer).toString('utf8')) as {
    success: boolean;
    items: string[];
  };
  assert.equal(decoded.success, true);
  assert.equal(decoded.items.length, 30);
});
