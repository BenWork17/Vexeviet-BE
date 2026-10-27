import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { BookingStatus, PaymentStatus } from '@vexeviet/database';
import type { AdminBookingQuery, AdminBookingSort } from '../types';

/**
 * Integer query param that is *clamped* rather than rejected when it is a
 * number outside the allowed range (contract: `limit` clamp 1..100, `page` >= 1).
 * A value that is not a number at all is still a 400 — zod names the query field
 * so the client can see which parameter is wrong.
 */
const clampedInt = (min: number, max: number, fallback: number): z.ZodType<number, z.ZodTypeDef, unknown> =>
  z.preprocess(
    value => (value === undefined || value === '' ? fallback : value),
    z.coerce
      .number({ invalid_type_error: 'Must be a number' })
      .int('Must be an integer')
      .transform(value => Math.min(max, Math.max(min, value)))
  );

/** YYYY-MM-DD (an ISO date, optionally with a time part); must parse. */
const isoDate = (field: string): z.ZodType<string, z.ZodTypeDef, string> =>
  z
    .string()
    .refine(
      value => /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) && !Number.isNaN(Date.parse(value)),
      { message: `${field} must be an ISO date (YYYY-MM-DD)` }
    );

const emptyToUndefined = (value: string): string | undefined =>
  value.trim() === '' ? undefined : value.trim();

/**
 * Query schema for `GET /api/v1/bookings/admin/all` (contract Shape 1).
 *
 * `operatorId` is validated as a uuid but is *ignored* by the service for an
 * OPERATOR token — scoping is derived from the JWT, never from the query string.
 */
export const adminBookingQuerySchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  operatorId: z.string().uuid('operatorId must be a uuid').optional(),
  q: z
    .string()
    .max(100)
    .transform(emptyToUndefined)
    .optional(),
  from: isoDate('from').optional(),
  to: isoDate('to').optional(),
  page: clampedInt(1, Number.MAX_SAFE_INTEGER, 1),
  limit: clampedInt(1, 100, 20),
  sort: z
    .enum(['createdAt', '-createdAt', 'departureDate', '-departureDate'])
    .default('-createdAt'),
});

/** Query schema for `GET /api/v1/bookings/admin/dashboard` (days 1..90, default 7). */
export const adminDashboardQuerySchema = z.object({
  days: clampedInt(1, 90, 7),
});

/** `res.locals` shape after `validateAdminBookingQuery` ran. */
export interface AdminBookingQueryLocals extends Record<string, unknown> {
  adminBookingQuery: AdminBookingQuery;
}

/** `res.locals` shape after `validateAdminDashboardQuery` ran. */
export interface AdminDashboardQueryLocals extends Record<string, unknown> {
  adminDashboardDays: number;
}

/**
 * Respond 400 in the service's existing error envelope, naming the offending
 * field (contract "Status-code rules": bad enum value → 400 naming the field).
 */
const sendQueryError = (res: Response, issues: z.ZodIssue[]): void => {
  res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid query parameters',
      details: issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    },
  });
};

/**
 * Validate/clamp the admin booking-list query and attach the parsed result to
 * `res.locals.adminBookingQuery` for the controller.
 */
export const validateAdminBookingQuery = (
  req: Request,
  res: Response<unknown, AdminBookingQueryLocals>,
  next: NextFunction
): void => {
  const result = adminBookingQuerySchema.safeParse(req.query);

  if (!result.success) {
    sendQueryError(res, result.error.errors);
    return;
  }

  res.locals.adminBookingQuery = {
    ...result.data,
    sort: result.data.sort as AdminBookingSort,
  };

  next();
};

/**
 * Validate/clamp the dashboard `days` query and attach it to
 * `res.locals.adminDashboardDays` for the controller.
 */
export const validateAdminDashboardQuery = (
  req: Request,
  res: Response<unknown, AdminDashboardQueryLocals>,
  next: NextFunction
): void => {
  const result = adminDashboardQuerySchema.safeParse(req.query);

  if (!result.success) {
    sendQueryError(res, result.error.errors);
    return;
  }

  res.locals.adminDashboardDays = result.data.days;

  next();
};
