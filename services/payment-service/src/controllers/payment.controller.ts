import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { CreatePaymentRequest, RefundRequest } from '../types';

export class PaymentController {
  createPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      let ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
        ipAddress = '127.0.0.1';
      }

      const data: CreatePaymentRequest = {
        ...req.body,
        ipAddress,
      };

      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

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
      const { paymentId } = req.params;
      const payment = await paymentService.getPayment(paymentId);

      if (!payment) {
        res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment',
      });
    }
  };

  getPaymentsByBooking = async (req: Request, res: Response): Promise<void> => {
    try {
      const { bookingId } = req.params;
      const payments = await paymentService.getPaymentsByBooking(bookingId);

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payments',
      });
    }
  };

  cancelPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
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
      const data: RefundRequest = {
        ...req.body,
        ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
      };

      const result = await paymentService.processRefund(data);

      res.status(200).json({
        success: true,
        data: result,
      });
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
