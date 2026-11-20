import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createReviewSchema = z.object({
  bookingId: z.string().uuid('bookingId must be a valid UUID'),
  rating: z
    .number({ invalid_type_error: 'rating must be an integer between 1 and 5' })
    .int('rating must be an integer between 1 and 5')
    .min(1, 'rating must be at least 1')
    .max(5, 'rating must be at most 5'),
  comment: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val.length <= 1000, 'comment must be at most 1000 characters')
    .optional()
    .nullable(),
});

export const replyReviewSchema = z.object({
  reply: z
    .string({ required_error: 'reply is required' })
    .transform((val) => val.trim())
    .refine((val) => val.length >= 1, 'reply cannot be empty')
    .refine((val) => val.length <= 1000, 'reply must be at most 1000 characters'),
});

export const myReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const eligibilityQuerySchema = z.object({
  bookingIds: z
    .string()
    .optional()
    .default('')
    .transform((raw) =>
      raw
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
    .refine((ids) => ids.length <= 50, 'At most 50 bookingIds may be requested at once')
    .refine(
      (ids) => ids.every((id) => UUID_REGEX.test(id)),
      'Every bookingId must be a valid UUID'
    ),
});

export const publicOperatorReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  sort: z.enum(['newest', 'highest', 'lowest']).default('newest'),
});

export const manageReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  replied: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z
    .string()
    .transform((v) => v.trim())
    .optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
  operatorId: z.string().uuid('operatorId must be a valid UUID').optional(),
});

export const manageStatsQuerySchema = z.object({
  operatorId: z.string().uuid('operatorId must be a valid UUID').optional(),
});

function sendValidationError(res: Response, error: z.ZodError): void {
  res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: error.errors[0]?.message || 'Invalid request data',
      details: error.errors,
    },
  });
}

export function validateReviewBody<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateReviewQuery<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      sendValidationError(res, parsed.error);
      return;
    }
    res.locals.validatedQuery = parsed.data;
    next();
  };
}
