import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { BookingStatus, PaymentStatus } from '@vexeviet/database';
import type {
  AdminBookingQuery,
  AdminBookingSort,
  AdminBookingNotesRequest,
  AdminBulkCancelRequest,
  AdminCancelBookingRequest,
} from '../types';

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

/**
 * Upper bound for `Booking.notes` coming from the admin console.
 *
 * The column is `String? @db.Text`, so the database accepts ~64 KB and will not
 * stop an oversized note. 2000 characters is far more than an internal
 * operational note needs while bounding the request body, the row size and the
 * cost of rendering the booking detail.
 */
export const ADMIN_BOOKING_NOTES_MAX_LENGTH = 2000;

/** Upper bound for a bulk-cancel batch; an unbounded batch is a DB DoS lever. */
export const ADMIN_BULK_CANCEL_MAX_IDS = 50;

/** A stated reason is required: an admin cancellation without one is unauditable. */
const adminCancelReason = z
  .string({ required_error: 'reason is required' })
  .trim()
  .min(1, 'reason must not be empty')
  .max(500, 'reason must be at most 500 characters');

/** Body of `POST /api/v1/bookings/admin/:id/cancel`. */
export const adminCancelBookingSchema = z.object({
  reason: adminCancelReason,
});

/** Body of `POST /api/v1/bookings/admin/cancel` (bulk, 1..50 unique uuids). */
export const adminBulkCancelSchema = z.object({
  ids: z
    .array(z.string().uuid('ids must contain uuids'), {
      required_error: 'ids is required',
      invalid_type_error: 'ids must be an array of uuids',
    })
    .min(1, 'ids must contain at least one booking id')
    .max(
      ADMIN_BULK_CANCEL_MAX_IDS,
      `ids must contain at most ${ADMIN_BULK_CANCEL_MAX_IDS} booking ids`
    )
    .refine(ids => new Set(ids).size === ids.length, {
      message: 'ids must not contain duplicates',
    }),
  reason: adminCancelReason,
});

/**
 * Body of `PATCH /api/v1/bookings/admin/:id/notes`.
 *
 * `null` clears the note; a whitespace-only string is treated as a clear too,
 * since an all-blank note carries no information and the column is nullable.
 */
export const adminBookingNotesSchema = z.object({
  notes: z.union([
    z
      .string({ invalid_type_error: 'notes must be a string or null' })
      .max(
        ADMIN_BOOKING_NOTES_MAX_LENGTH,
        `notes must be at most ${ADMIN_BOOKING_NOTES_MAX_LENGTH} characters`
      )
      .transform(value => {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
      }),
    z.null(),
  ]),
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

/** `res.locals` shape after `validateAdminCancelBody` ran. */
export interface AdminCancelBodyLocals extends Record<string, unknown> {
  adminCancelBody: AdminCancelBookingRequest;
}

/** `res.locals` shape after `validateAdminBulkCancelBody` ran. */
export interface AdminBulkCancelBodyLocals extends Record<string, unknown> {
  adminBulkCancelBody: AdminBulkCancelRequest;
}

/** `res.locals` shape after `validateAdminBookingNotesBody` ran. */
export interface AdminBookingNotesBodyLocals extends Record<string, unknown> {
  adminBookingNotesBody: AdminBookingNotesRequest;
}

/**
 * Respond 400 in the service's existing error envelope, naming each offending
 * body field.
 *
 * The admin action endpoints validate their body here rather than through the
 * shared `validateBody`, because the parsed (trimmed/transformed) value must
 * reach the controller; `validateBody` only parses and discards the result.
 */
const sendBodyError = (res: Response, issues: z.ZodIssue[]): void => {
  res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    },
  });
};

/** Build a body-validation middleware that stores the parsed value on `res.locals[key]`. */
const validateAdminBody =
  <T>(schema: z.ZodSchema<T, z.ZodTypeDef, unknown>, key: string) =>
  function adminBodyValidator(req: Request, res: Response, next: NextFunction): void {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      sendBodyError(res, result.error.errors);
      return;
    }

    res.locals[key] = result.data;
    next();
  };

/** Validate the admin single-cancel body → `res.locals.adminCancelBody`. */
export const validateAdminCancelBody = validateAdminBody<AdminCancelBookingRequest>(
  adminCancelBookingSchema,
  'adminCancelBody'
);

/** Validate the admin bulk-cancel body → `res.locals.adminBulkCancelBody`. */
export const validateAdminBulkCancelBody = validateAdminBody<AdminBulkCancelRequest>(
  adminBulkCancelSchema,
  'adminBulkCancelBody'
);

/** Validate the admin notes body → `res.locals.adminBookingNotesBody`. */
export const validateAdminBookingNotesBody = validateAdminBody<AdminBookingNotesRequest>(
  adminBookingNotesSchema,
  'adminBookingNotesBody'
);
