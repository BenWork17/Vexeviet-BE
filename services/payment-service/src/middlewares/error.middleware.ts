import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error('Error:', {
    statusCode,
    message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
};

export class PaymentError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'PAYMENT_ERROR') {
    super(message);
    this.name = 'PaymentError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class VNPayError extends PaymentError {
  responseCode: string;

  constructor(message: string, responseCode: string) {
    super(message, 400, 'VNPAY_ERROR');
    this.name = 'VNPayError';
    this.responseCode = responseCode;
  }
}

export class IdempotencyError extends PaymentError {
  constructor(message: string) {
    super(message, 409, 'IDEMPOTENCY_ERROR');
    this.name = 'IdempotencyError';
  }
}
