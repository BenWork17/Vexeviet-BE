import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Supported bank codes for VNPay sandbox testing
export const VNPAY_SUPPORTED_BANKS = [
  'NCB', 'SACOMBANK', 'EXIMBANK', 'MSBANK', 'NAMABANK',
  'VNMART', 'VIETINBANK', 'VIETCOMBANK', 'HDBANK', 'DONGABANK',
  'TPBANK', 'OJB', 'BIDV', 'TECHCOMBANK', 'VPBANK', 'AGRIBANK',
  'MBBANK', 'ACB', 'OCB', 'SHB', 'IVB',
] as const;

export const createPaymentSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['VNPAY', 'MOMO', 'ZALOPAY', 'BANK_TRANSFER', 'CASH']),
  returnUrl: z.string().url('Invalid return URL').optional(),
  cancelUrl: z.string().url('Invalid cancel URL').optional(),
  orderInfo: z.string().max(255).optional(),
  locale: z.enum(['vn', 'en']).default('vn'),
  bankCode: z.string().optional(),
});

export const refundSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
  amount: z.number().positive('Amount must be positive').optional(),
  reason: z.string().min(1).max(500),
});

export const PAYMENT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;

export const PAYMENT_METHODS = ['VNPAY', 'MOMO', 'ZALOPAY', 'BANK_TRANSFER', 'CASH'] as const;

/** Provider display labels, per contract Shape 2. */
export const PROVIDER_LABELS = ['VNPay', 'Momo', 'ZaloPay', 'BankTransfer', 'Cash'] as const;

/** `limit` clamp 1..100 default 20, `page` >= 1 default 1. */
const paginationFields = {
  page: z.coerce.number().int().min(1, 'page must be >= 1').default(1),
  limit: z.coerce.number().int().min(1, 'limit must be >= 1').max(100, 'limit must be <= 100').default(20),
};

const isoDate = (field: string): z.ZodEffects<z.ZodTypeAny, Date, unknown> =>
  z
    .string()
    .trim()
    .min(1, `${field} must not be blank`)
    .refine((value) => !Number.isNaN(Date.parse(value)), `${field} must be a valid ISO date`)
    .transform((value) => new Date(value));

/** `method` (enum) and `provider` (display label) address the same column. */
const PROVIDER_METHOD_PAIRS: Record<(typeof PROVIDER_LABELS)[number], (typeof PAYMENT_METHODS)[number]> = {
  VNPay: 'VNPAY',
  Momo: 'MOMO',
  ZaloPay: 'ZALOPAY',
  BankTransfer: 'BANK_TRANSFER',
  Cash: 'CASH',
};

export const adminPaymentListQuerySchema = z
  .object({
    status: z.enum(PAYMENT_STATUSES, {
      errorMap: () => ({ message: 'status must be a valid PaymentStatus' }),
    }).optional(),
    method: z.enum(PAYMENT_METHODS, {
      errorMap: () => ({ message: 'method must be a valid PaymentMethod' }),
    }).optional(),
    bookingCode: z.string().trim().min(1, 'bookingCode must not be blank').optional(),
    provider: z.enum(PROVIDER_LABELS, {
      errorMap: () => ({ message: 'provider must be a valid provider label' }),
    }).optional(),
    from: isoDate('from').optional(),
    to: isoDate('to').optional(),
    ...paginationFields,
  })
  .superRefine((value, ctx) => {
    if (value.method && value.provider && PROVIDER_METHOD_PAIRS[value.provider] !== value.method) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['provider'],
        message: 'provider conflicts with method',
      });
    }

    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from'],
        message: 'from must be before or equal to to',
      });
    }
  });

export const adminPaymentSummaryQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .min(1, 'days must be >= 1')
    .max(90, 'days must be <= 90')
    .default(7),
});

/** Post-parse query shapes, so controllers do not re-declare them. */
export type AdminPaymentListQuery = z.infer<typeof adminPaymentListQuerySchema>;
export type AdminPaymentSummaryQuery = z.infer<typeof adminPaymentSummaryQuerySchema>;

type QuerySchemaResult<T> = { ok: true; data: T } | { ok: false; error: z.ZodError };

const parseQuery = <T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, raw: unknown): QuerySchemaResult<T> => {
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: parsed.error };
};

const sendQueryError = (res: Response, error: z.ZodError): void => {
  res.status(400).json({
    success: false,
    error: error.errors[0]?.message || 'Validation failed',
    details: error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  });
};

export const validateAdminPaymentList = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = parseQuery(adminPaymentListQuerySchema, req.query);
  if (!result.ok) {
    sendQueryError(res, result.error);
    return;
  }
  req.query = result.data as unknown as Request['query'];
  next();
};

export const validateAdminPaymentSummary = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = parseQuery(adminPaymentSummaryQuerySchema, req.query);
  if (!result.ok) {
    sendQueryError(res, result.error);
    return;
  }
  req.query = result.data as unknown as Request['query'];
  next();
};

export const validateCreatePayment = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    req.body = createPaymentSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    next(error);
  }
};

export const validateRefund = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    req.body = refundSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    next(error);
  }
};
