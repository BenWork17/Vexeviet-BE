import { Request, Response } from 'express';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { paymentAdminService } from '../services/payment-admin.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  AdminPaymentListQuery,
  AdminPaymentReconciliationQuery,
  AdminPaymentSummaryQuery,
} from '../validators/payment.validator';
import { AdminPaymentListFilters, ResyncBookingRequest } from '../types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: string | undefined): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);

export class PaymentAdminController {
  listAdminPayments = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const query = req.query as unknown as AdminPaymentListQuery;

      const filters: AdminPaymentListFilters = {
        ...(query.status ? { status: query.status as PaymentStatus } : {}),
        ...(query.method ? { method: query.method as PaymentMethod } : {}),
        ...(query.bookingCode ? { bookingCode: query.bookingCode } : {}),
        ...(query.provider ? { provider: query.provider } : {}),
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
        ...(user.role === 'OPERATOR' ? { operatorId: user.userId } : {}),
      };

      const result = await paymentAdminService.listAdminPayments(filters, query.page, query.limit);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode || 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list payments',
        code: (error as { code?: string }).code,
      });
    }
  };

  getAdminPaymentSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const { days } = req.query as unknown as AdminPaymentSummaryQuery;
      const summary = await paymentAdminService.getAdminPaymentSummary(days, user);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode || 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to build payment summary',
        code: (error as { code?: string }).code,
      });
    }
  };

  resyncPaymentBooking = async (req: Request, res: Response): Promise<void> => {
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

      const body = req.body as ResyncBookingRequest;
      const result = await paymentAdminService.resyncBookingStatus(paymentId, body.reason, user);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode || 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to re-sync booking',
        code: (error as { code?: string }).code,
      });
    }
  };

  listReconciliation = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as AuthRequest).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      const { page, limit } = req.query as unknown as AdminPaymentReconciliationQuery;
      const result = await paymentAdminService.getReconciliation(page, limit);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode || 400;
      res.status(statusCode).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to build reconciliation report',
        code: (error as { code?: string }).code,
      });
    }
  };
}

export const paymentAdminController = new PaymentAdminController();
