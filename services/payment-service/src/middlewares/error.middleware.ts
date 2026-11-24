import {
  AppError,
  ConflictError,
  createErrorHandler,
  notFoundHandler,
} from '@vexeviet/common';

export { AppError, notFoundHandler };
export const errorHandler = createErrorHandler('payment-service');

export class PaymentError extends AppError {
  constructor(message: string, statusCode = 400, code = 'PAYMENT_ERROR') {
    super(message, statusCode, code);
  }
}

export class VNPayError extends PaymentError {
  responseCode: string;

  constructor(message: string, responseCode: string) {
    super(message, 400, 'VNPAY_ERROR');
    this.responseCode = responseCode;
  }
}

export class IdempotencyError extends ConflictError {
  constructor(message: string) {
    super(message, 'IDEMPOTENCY_ERROR');
  }
}
