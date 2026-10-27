import { timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';

/** Header the payment-service sends when calling the internal booking endpoints. */
export const INTERNAL_API_KEY_HEADER = 'x-internal-api-key';

/**
 * Compare two secrets in constant time.
 *
 * `timingSafeEqual` requires equal-length buffers, and the length difference
 * itself is not secret-ish here (it is our configured key's length), so a
 * length mismatch short-circuits to `false`.
 */
const safeEqual = (provided: string, expected: string): boolean => {
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(providedBuf, expectedBuf);
};

/**
 * Guard for the internal-only booking endpoints
 * (`POST /bookings/:id/confirm`, `POST /bookings/:id/payment-failed`).
 *
 * FAIL CLOSED. These are not public endpoints; the bug being fixed is that
 * anyone could hit them and confirm a booking without paying. Therefore:
 * - `BOOKING_SERVICE_INTERNAL_API_KEY` unset or empty → **503** and the request
 *   is NOT processed. A missing configuration is an operator error, not a
 *   reason to expose the endpoint.
 * - Header missing or not matching → **401**.
 * - Match → proceed.
 *
 * The key is read from `process.env` per request so a redeploy/env change does
 * not need a rebuilt module and tests can set it.
 */
export const internalKeyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const expected = process.env.BOOKING_SERVICE_INTERNAL_API_KEY;

  if (!expected) {
    res.status(503).json({
      success: false,
      error: {
        code: 'INTERNAL_API_KEY_NOT_CONFIGURED',
        message:
          'Internal booking endpoints are disabled: BOOKING_SERVICE_INTERNAL_API_KEY is not configured on booking-service.',
      },
    });
    return;
  }

  const rawHeader = req.headers[INTERNAL_API_KEY_HEADER];
  const provided = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (!provided || !safeEqual(provided, expected)) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing internal API key',
      },
    });
    return;
  }

  next();
};
