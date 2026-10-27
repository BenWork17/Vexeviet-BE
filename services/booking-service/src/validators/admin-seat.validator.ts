import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import type { AdminSeatBlockRequest, AdminSeatUnblockRequest } from '../types';

/**
 * Validators for the admin maintenance seat-block endpoints.
 *
 * Kept in their own file rather than appended to `booking.validator.ts`: that
 * file's seats schemas are all `z.any()` passthroughs for the *customer* routes,
 * and these are admin writes that mutate seat state. Mixing a real schema into
 * that file invites someone to assume the passthroughs are real too.
 *
 * They also cannot use the shared `validateBody`: it calls `schema.parse()` and
 * discards the parsed value, so the trimmed `reason` and the normalised date
 * would never reach the controller. `validateAdminBody` here follows P7's
 * `admin-booking.validator.ts` pattern and stores the parsed body on
 * `res.locals`.
 */

/** Upper bound for one admin block/unblock request; an unbounded batch is a DB DoS lever. */
export const ADMIN_SEAT_BLOCK_MAX_SEATS = 50;

/** Upper bound for the maintenance reason, matching the neighbouring admin reason limit. */
export const ADMIN_SEAT_BLOCK_REASON_MAX_LENGTH = 500;

/**
 * A real calendar date in `YYYY-MM-DD` form.
 *
 * `Date.parse` alone is too permissive: it accepts `2026-02-30` by rolling it
 * over to March 2. The round-trip check below rejects anything the calendar does
 * not actually contain, and the regex rejects unpadded `2026-1-1` (which the
 * `BookingSeat.departureDate` normalisation would silently accept as January 1).
 */
const isoCalendarDate = (field: string): z.ZodType<string, z.ZodTypeDef, unknown> =>
  z
    .string({ required_error: `${field} is required`, invalid_type_error: `${field} must be a string` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${field} must be a date in YYYY-MM-DD form`)
    .refine(value => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, `${field} must be a real calendar date`);

const seatNumbersSchema = z
  .array(
    z
      .string({ invalid_type_error: 'seatNumbers must contain strings' })
      .trim()
      .min(1, 'seatNumbers must not contain empty values')
      .max(5, 'seatNumbers must be at most 5 characters'),
    {
      required_error: 'seatNumbers is required',
      invalid_type_error: 'seatNumbers must be an array of seat numbers',
    }
  )
  .min(1, 'seatNumbers must contain at least one seat')
  .max(
    ADMIN_SEAT_BLOCK_MAX_SEATS,
    `seatNumbers must contain at most ${ADMIN_SEAT_BLOCK_MAX_SEATS} seats`
  )
  .refine(seats => new Set(seats).size === seats.length, {
    message: 'seatNumbers must not contain duplicates',
  });

/** Body of `POST /api/v1/seats/admin/block`. `reason` is required. */
export const adminSeatBlockSchema = z.object({
  routeId: z
    .string({ required_error: 'routeId is required', invalid_type_error: 'routeId must be a string' })
    .uuid('routeId must be a uuid'),
  departureDate: isoCalendarDate('departureDate'),
  seatNumbers: seatNumbersSchema,
  reason: z
    .string({ required_error: 'reason is required', invalid_type_error: 'reason must be a string' })
    .trim()
    .min(1, 'reason must not be empty')
    .max(
      ADMIN_SEAT_BLOCK_REASON_MAX_LENGTH,
      `reason must be at most ${ADMIN_SEAT_BLOCK_REASON_MAX_LENGTH} characters`
    ),
});

/**
 * Body of `POST /api/v1/seats/admin/unblock`.
 *
 * A supplied `reason` is **stripped, not rejected**: this is a `POST` (see the
 * router comment for why `POST` rather than `DELETE` with a body), and a client
 * that mirrors its block payload must not get a 400 for a field the server
 * simply does not use. `z.object` is non-strict, so unknown keys are dropped and
 * the controller only ever sees `routeId`/`departureDate`/`seatNumbers`.
 */
export const adminSeatUnblockSchema = z.object({
  routeId: z
    .string({ required_error: 'routeId is required', invalid_type_error: 'routeId must be a string' })
    .uuid('routeId must be a uuid'),
  departureDate: isoCalendarDate('departureDate'),
  seatNumbers: seatNumbersSchema,
});

/** `res.locals` shape after `validateAdminSeatBlockBody` ran. */
export interface AdminSeatBlockBodyLocals extends Record<string, unknown> {
  adminSeatBlockBody: AdminSeatBlockRequest;
}

/** `res.locals` shape after `validateAdminSeatUnblockBody` ran. */
export interface AdminSeatUnblockBodyLocals extends Record<string, unknown> {
  adminSeatUnblockBody: AdminSeatUnblockRequest;
}

/**
 * Respond 400 in the service's existing nested error envelope, naming each
 * offending body field (contract "Status-code rules").
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

/** Validate the admin seat-block body → `res.locals.adminSeatBlockBody`. */
export const validateAdminSeatBlockBody = validateAdminBody<AdminSeatBlockRequest>(
  adminSeatBlockSchema,
  'adminSeatBlockBody'
);

/** Validate the admin seat-unblock body → `res.locals.adminSeatUnblockBody`. */
export const validateAdminSeatUnblockBody = validateAdminBody<AdminSeatUnblockRequest>(
  adminSeatUnblockSchema,
  'adminSeatUnblockBody'
);
