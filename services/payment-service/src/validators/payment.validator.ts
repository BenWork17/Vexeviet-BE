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
