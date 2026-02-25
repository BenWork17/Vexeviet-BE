import { v4 as uuidv4 } from 'uuid';
import { PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { paymentConfig } from '../config';
import {
  CreatePaymentRequest,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
  PaymentDTO,
} from '../types';
import { paymentRepository } from '../repositories/payment.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { vnpayService } from './vnpay.service';
import { generateTransactionRef } from '../utils/signature';
import {
  getIdempotencyRecord,
  setIdempotencyRecord,
} from '../utils/idempotency';
import { PaymentError } from '../middlewares/error.middleware';

export class PaymentService {
  async createPayment(
    data: CreatePaymentRequest,
    idempotencyKey?: string
  ): Promise<PaymentResponse> {
    if (idempotencyKey) {
      const existingRecord = await getIdempotencyRecord(idempotencyKey);
      if (existingRecord) {
        console.log(`Idempotency hit for key: ${idempotencyKey}`);
        return existingRecord.response;
      }
    }

    const transactionRef = generateTransactionRef();
    const expiredAt = new Date(Date.now() + paymentConfig.paymentExpireMinutes * 60 * 1000);

    const payment = await paymentRepository.create({
      id: uuidv4(),
      booking: { connect: { id: data.bookingId } },
      amount: new Prisma.Decimal(data.amount),
      method: data.method,
      status: PaymentStatus.PENDING,
      transactionRef,
      expiredAt,
      metadata: {
        orderInfo: data.orderInfo,
        locale: data.locale,
        ipAddress: data.ipAddress,
      },
    });

    let paymentUrl: string;

    switch (data.method) {
      case PaymentMethod.VNPAY:
        paymentUrl = vnpayService.createPaymentUrl(
          payment.id,
          transactionRef,
          data.amount,
          data.orderInfo || `Thanh toan don hang ${transactionRef}`,
          data.ipAddress,
          data.locale,
          data.returnUrl,
          data.bankCode
        );
        break;

      case PaymentMethod.MOMO:
      case PaymentMethod.ZALOPAY:
        throw new PaymentError(`${data.method} integration not implemented yet`, 501, 'NOT_IMPLEMENTED');

      case PaymentMethod.BANK_TRANSFER:
        paymentUrl = `/payment/bank-transfer/${payment.id}`;
        break;

      case PaymentMethod.CASH:
        paymentUrl = '';
        break;

      default:
        throw new PaymentError('Invalid payment method', 400, 'INVALID_METHOD');
    }

    await paymentRepository.updateStatus(payment.id, PaymentStatus.PENDING, {
      paymentUrl,
    });

    const response: PaymentResponse = {
      paymentId: payment.id,
      paymentUrl,
      transactionId: transactionRef,
      expiredAt,
    };

    if (idempotencyKey) {
      await setIdempotencyRecord(idempotencyKey, payment.id, response);
    }

    return response;
  }

  async getPayment(paymentId: string): Promise<PaymentDTO | null> {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) return null;

    return {
      id: payment.id,
      bookingId: payment.bookingId,
      amount: payment.amount.toNumber(),
      method: payment.method,
      status: payment.status,
      transactionId: payment.transactionRef,
      paymentUrl: payment.paymentUrl,
      paidAt: payment.paidAt,
      expiredAt: payment.expiredAt,
      createdAt: payment.createdAt,
    };
  }

  async getPaymentsByBooking(bookingId: string): Promise<PaymentDTO[]> {
    const payments = await paymentRepository.findByBookingId(bookingId);

    return payments.map((payment) => ({
      id: payment.id,
      bookingId: payment.bookingId,
      amount: payment.amount.toNumber(),
      method: payment.method,
      status: payment.status,
      transactionId: payment.transactionRef,
      paymentUrl: payment.paymentUrl,
      paidAt: payment.paidAt,
      expiredAt: payment.expiredAt,
      createdAt: payment.createdAt,
    }));
  }

  async processRefund(data: RefundRequest): Promise<RefundResponse> {
    const payment = await paymentRepository.findById(data.paymentId);

    if (!payment) {
      throw new PaymentError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new PaymentError('Only completed payments can be refunded', 400, 'INVALID_PAYMENT_STATUS');
    }

    const refundedAmount = await transactionRepository.getRefundedAmount(payment.id);
    const availableRefund = payment.amount.toNumber() - refundedAmount;
    const refundAmount = data.amount || availableRefund;

    if (refundAmount > availableRefund) {
      throw new PaymentError(
        `Refund amount exceeds available amount. Available: ${availableRefund}`,
        400,
        'INSUFFICIENT_REFUND_AMOUNT'
      );
    }

    const refundTransaction = await transactionRepository.createRefundTransaction(
      payment.id,
      refundAmount,
      data.reason
    );

    console.log(`Refund initiated: ${refundTransaction.id} for payment ${payment.id}`);

    return {
      success: true,
      refundId: refundTransaction.id,
      amount: refundAmount,
      status: refundTransaction.status,
      message: 'Refund initiated successfully',
    };
  }

  async expireStalePayments(): Promise<number> {
    const expiredPayments = await paymentRepository.findExpiredPayments();

    if (expiredPayments.length === 0) return 0;

    const ids = expiredPayments.map((p) => p.id);
    const result = await paymentRepository.markAsExpired(ids);

    console.log(`Expired ${result.count} stale payments`);

    return result.count;
  }

  async cancelPayment(paymentId: string): Promise<void> {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      throw new PaymentError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new PaymentError('Only pending payments can be cancelled', 400, 'INVALID_PAYMENT_STATUS');
    }

    await paymentRepository.updateStatus(paymentId, PaymentStatus.CANCELLED);
  }
}

export const paymentService = new PaymentService();
