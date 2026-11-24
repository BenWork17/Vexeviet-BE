import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { paymentAdminController } from './payment-admin.controller';
import { AuthRequest, canAccessBooking, sendForbidden } from '../middlewares/auth.middleware';
import { CreatePaymentRequest, RefundRequest } from '../types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: string | undefined): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);

export class PaymentController {
  listAdminPayments = paymentAdminController.listAdminPayments;
  getAdminPaymentSummary = paymentAdminController.getAdminPaymentSummary;
  resyncPaymentBooking = paymentAdminController.resyncPaymentBooking;
  listReconciliation = paymentAdminController.listReconciliation;

  createPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      let ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
        ipAddress = '127.0.0.1';
      }

      const data: CreatePaymentRequest = {
        ...req.body,
        ipAddress,
      };

      const owner = await paymentService.getBookingOwner(data.bookingId);
      if (!owner) {
        res.status(404).json({
          success: false,
          error: 'Booking not found',
          code: 'BOOKING_NOT_FOUND',
        });
        return;
      }

      if (!canAccessBooking(user, owner)) {
        sendForbidden(res);
        return;
      }

      const rawIdempotencyKey = req.headers['idempotency-key'] as string | undefined;
      const idempotencyKey = rawIdempotencyKey
        ? `${user.userId}:${rawIdempotencyKey}`
        : undefined;

      const result = await paymentService.createPayment(data, idempotencyKey);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode || 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment',
        code: (error as { code?: string }).code,
      });
    }
  };

  getPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const { paymentId } = req.params;
      if (!isUuid(paymentId)) {
        res.status(400).json({
          success: false,
          error: 'paymentId must be a valid uuid',
          code: 'INVALID_ID',
        });
        return;
      }

      const owner = await paymentService.getBookingOwnerByPaymentId(paymentId);
      if (!owner) {
        res.status(404).json({
          success: false,
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND',
        });
        return;
      }

      if (!canAccessBooking(user, owner)) {
        sendForbidden(res);
        return;
      }

      const payment = await paymentService.getPayment(paymentId);
      if (!payment) {
        res.status(404).json({ success: false, error: 'Payment not found' });
        return;
      }

      res.status(200).json({ success: true, data: payment });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment',
      });
    }
  };

  getPaymentStatusByTransactionRef = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const raw = req.query.transactionRef;
      const transactionRef = typeof raw === 'string' ? raw.trim() : '';

      if (!transactionRef) {
        res.status(400).json({ success: false, error: 'transactionRef is required' });
        return;
      }

      const owner = await paymentService.getBookingOwnerByTransactionRef(transactionRef);
      if (!owner) {
        res.status(404).json({ success: false, error: 'Payment not found' });
        return;
      }

      if (!canAccessBooking(user, owner)) {
        sendForbidden(res);
        return;
      }

      const status = await paymentService.getPaymentStatusByTransactionRef(transactionRef);
      if (!status) {
        res.status(404).json({ success: false, error: 'Payment not found' });
        return;
      }

      res.status(200).json({ success: true, data: status });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment status',
      });
    }
  };

  getPaymentsByBooking = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const { bookingId } = req.params;
      if (!isUuid(bookingId)) {
        res.status(400).json({
          success: false,
          error: 'bookingId must be a valid uuid',
          code: 'INVALID_ID',
        });
        return;
      }

      const owner = await paymentService.getBookingOwner(bookingId);
      if (!owner) {
        res.status(200).json({ success: true, data: [] });
        return;
      }

      if (!canAccessBooking(user, owner)) {
        sendForbidden(res);
        return;
      }

      const payments = await paymentService.getPaymentsByBooking(bookingId);
      res.status(200).json({ success: true, data: payments });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payments',
      });
    }
  };

  cancelPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const { paymentId } = req.params;
      if (!isUuid(paymentId)) {
        res.status(400).json({
          success: false,
          error: 'paymentId must be a valid uuid',
          code: 'INVALID_ID',
        });
        return;
      }

      const owner = await paymentService.getBookingOwnerByPaymentId(paymentId);
      if (!owner) {
        res.status(404).json({
          success: false,
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND',
        });
        return;
      }

      if (!canAccessBooking(user, owner)) {
        sendForbidden(res);
        return;
      }

      await paymentService.cancelPayment(paymentId);
      res.status(200).json({
        success: true,
        message: 'Payment cancelled successfully',
      });
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode || 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel payment',
      });
    }
  };

  processRefund = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const data: RefundRequest = {
        ...req.body,
        ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
      };

      const result = await paymentService.processRefund(data, user);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode || 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund',
        code: (error as { code?: string }).code,
      });
    }
  };
}

export const paymentController = new PaymentController();
