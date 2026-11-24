import { BookingStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { writeAuditLog } from '@vexeviet/database';
import {
  AdminPayment,
  AdminPaymentListFilters,
  AdminPaymentProvider,
  AdminPaymentRisk,
  AdminPaymentSummary,
  BookingResyncResponse,
  LabeledCount,
  Pagination,
  ReconciliationMismatch,
  ReconciliationRow,
  TokenPayload,
} from '../types';
import {
  paymentRepository,
  AdminPaymentRow,
  CompletedPaymentPoint,
} from '../repositories/payment.repository';
import {
  BookingSyncError,
  BookingSyncUnavailableError,
  bookingSyncService,
  resolveBookingSyncTarget,
} from './booking-sync.service';
import { PaymentError } from '../middlewares/error.middleware';

const PROVIDER_BY_METHOD: Record<PaymentMethod, AdminPaymentProvider> = {
  VNPAY: 'VNPay',
  MOMO: 'Momo',
  ZALOPAY: 'ZaloPay',
  BANK_TRANSFER: 'BankTransfer',
  CASH: 'Cash',
};

const PROVIDER_TO_METHOD: Record<AdminPaymentProvider, PaymentMethod> = {
  VNPay: PaymentMethod.VNPAY,
  Momo: PaymentMethod.MOMO,
  ZaloPay: PaymentMethod.ZALOPAY,
  BankTransfer: PaymentMethod.BANK_TRANSFER,
  Cash: PaymentMethod.CASH,
};

const PENDING_WATCH_MINUTES = 15;
const PROCESSING_WATCH_MINUTES = 30;

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const addDays = (date: Date, delta: number): Date => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + delta);
  return next;
};

const minutesSince = (from: Date, now: Date): number => (now.getTime() - from.getTime()) / 60000;

const deriveRisk = (
  status: PaymentStatus,
  createdAt: Date,
  now: Date
): AdminPaymentRisk => {
  if (status === PaymentStatus.FAILED || status === PaymentStatus.REFUNDED) {
    return 'urgent';
  }
  const age = minutesSince(createdAt, now);
  if (status === PaymentStatus.PENDING && age > PENDING_WATCH_MINUTES) return 'watch';
  if (status === PaymentStatus.PROCESSING && age > PROCESSING_WATCH_MINUTES) return 'watch';
  return 'normal';
};

export const classifyMismatch = (
  paymentStatus: PaymentStatus,
  bookingStatus: BookingStatus
): ReconciliationMismatch | null => {
  if (paymentStatus === PaymentStatus.COMPLETED) {
    if (bookingStatus === BookingStatus.PENDING) return 'BOOKING_NOT_CONFIRMED';
    if (bookingStatus === BookingStatus.CANCELLED) return 'PAID_BUT_CANCELLED';
    return null;
  }

  if (
    paymentStatus === PaymentStatus.FAILED ||
    paymentStatus === PaymentStatus.CANCELLED ||
    paymentStatus === PaymentStatus.EXPIRED
  ) {
    return bookingStatus === BookingStatus.PENDING ||
      bookingStatus === BookingStatus.CONFIRMED
      ? 'BOOKING_NOT_CANCELLED'
      : null;
  }

  return null;
};

const buildDailyTrend = (
  points: CompletedPaymentPoint[],
  from: Date,
  days: number
): LabeledCount[] => {
  const totals = new Map<string, number>();

  for (let index = 0; index < days; index += 1) {
    totals.set(toDateKey(addDays(from, index)), 0);
  }

  for (const point of points) {
    const key = toDateKey(point.createdAt);
    const current = totals.get(key);
    if (current !== undefined) {
      totals.set(key, current + point.amount.toNumber());
    }
  }

  return Array.from(totals, ([label, value]) => ({ label, value }));
};

export class PaymentAdminService {
  async listAdminPayments(
    filters: AdminPaymentListFilters,
    page: number,
    limit: number
  ): Promise<{ data: AdminPayment[]; pagination: Pagination }> {
    const createdAt =
      filters.from || filters.to
        ? {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: endOfDay(filters.to) } : {}),
          }
        : undefined;

    const resolvedMethod =
      filters.method ?? (filters.provider ? PROVIDER_TO_METHOD[filters.provider] : undefined);

    const bookingFilter: Prisma.BookingWhereInput = {
      ...(filters.operatorId ? { route: { operatorId: filters.operatorId } } : {}),
      ...(filters.bookingCode ? { bookingCode: filters.bookingCode } : {}),
    };

    const where: Prisma.PaymentWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(resolvedMethod ? { method: resolvedMethod } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(Object.keys(bookingFilter).length > 0 ? { booking: bookingFilter } : {}),
    };

    const [rows, total] = await Promise.all([
      paymentRepository.findManyAdmin(where, (page - 1) * limit, limit),
      paymentRepository.countAdmin(where),
    ]);

    const now = new Date();

    return {
      data: rows.map((row) => this.toAdminPayment(row, now)),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getAdminPaymentSummary(days: number, actor: TokenPayload): Promise<AdminPaymentSummary> {
    const now = new Date();
    const from = startOfDay(addDays(now, -(days - 1)));

    const bookingFilter: Prisma.BookingWhereInput = {
      ...(actor.role === 'OPERATOR' ? { route: { operatorId: actor.userId } } : {}),
    };

    const windowWhere: Prisma.PaymentWhereInput = {
      createdAt: { gte: from, lte: endOfDay(now) },
      ...(Object.keys(bookingFilter).length > 0 ? { booking: bookingFilter } : {}),
    };

    const [grouped, completedPoints] = await Promise.all([
      paymentRepository.countByStatusAdmin(windowWhere),
      paymentRepository.findCompletedAmountsInWindow({
        ...windowWhere,
        status: PaymentStatus.COMPLETED,
      }),
    ]);

    const totalCompleted = completedPoints.reduce(
      (sum, point) => sum + point.amount.toNumber(),
      0
    );

    const countByStatus: LabeledCount[] = grouped
      .map((row) => ({ label: row.status, value: row.count }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    const expiredCount = grouped.find((row) => row.status === PaymentStatus.EXPIRED)?.count ?? 0;

    return {
      totalCompleted,
      countByStatus,
      providerTrend: buildDailyTrend(completedPoints, from, days),
      expiredCount,
    };
  }

  async resyncBookingStatus(
    paymentId: string,
    reason: string | undefined,
    actor: TokenPayload
  ): Promise<BookingResyncResponse> {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      throw new PaymentError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    const target = resolveBookingSyncTarget(payment.status);

    if (!target) {
      throw new PaymentError(
        `Payment status ${payment.status} has no booking sync (only COMPLETED, FAILED, CANCELLED and EXPIRED can be re-synced)`,
        409,
        'PAYMENT_STATUS_NOT_SYNCABLE'
      );
    }

    const auditBase = {
      actorId: actor.userId,
      actorName: actor.email || actor.userId,
      actorRole: actor.role,
      action: 'PAYMENT_BOOKING_RESYNCED',
      target: `payment:${payment.transactionRef}`,
      targetId: payment.id,
      severity: 'WARNING',
    } as const;

    try {
      await bookingSyncService.syncBookingStatusAfterPayment(
        payment.bookingId,
        payment.status,
        reason
      );
    } catch (error) {
      if (error instanceof BookingSyncError && error.status === 409) {
        const bookingStatus = await paymentRepository.findBookingStatus(payment.bookingId);

        await writeAuditLog({
          ...auditBase,
          metadata: {
            paymentStatus: payment.status,
            intendedBookingAction: target.action,
            outcome: 'already_consistent',
            downstreamStatus: error.status,
          },
        });

        return {
          synced: false,
          alreadyConsistent: true,
          bookingStatus: bookingStatus ?? target.bookingStatus,
        };
      }

      const downstreamStatus = error instanceof BookingSyncError ? error.status : undefined;

      await writeAuditLog({
        ...auditBase,
        metadata: {
          paymentStatus: payment.status,
          intendedBookingAction: target.action,
          outcome: 'failed',
          ...(downstreamStatus !== undefined ? { downstreamStatus } : {}),
        },
      });

      if (error instanceof BookingSyncError && (error.status === 401 || error.status === 503)) {
        throw new PaymentError(
          `Booking service rejected the internal API call (status ${error.status}). Check BOOKING_SERVICE_INTERNAL_API_KEY.`,
          502,
          'BOOKING_SYNC_REJECTED'
        );
      }

      if (error instanceof BookingSyncUnavailableError) {
        throw new PaymentError(
          'Booking service is unreachable. The booking was not re-synced.',
          502,
          'BOOKING_SYNC_UNAVAILABLE'
        );
      }

      throw new PaymentError(
        `Booking sync failed${
          downstreamStatus !== undefined ? ` (status ${downstreamStatus})` : ''
        }. The booking was not re-synced.`,
        502,
        'BOOKING_SYNC_FAILED'
      );
    }

    await writeAuditLog({
      ...auditBase,
      metadata: {
        paymentStatus: payment.status,
        intendedBookingAction: target.action,
        outcome: 'synced',
      },
    });

    return {
      synced: true,
      bookingStatus: target.bookingStatus,
    };
  }

  async getReconciliation(
    page: number,
    limit: number
  ): Promise<{ data: ReconciliationRow[]; pagination: Pagination }> {
    const [rows, total] = await Promise.all([
      paymentRepository.findManyReconciliation((page - 1) * limit, limit),
      paymentRepository.countReconciliation(),
    ]);

    const data: ReconciliationRow[] = [];

    for (const row of rows) {
      const mismatch = classifyMismatch(row.status, row.booking.status);
      if (!mismatch) continue;

      data.push({
        paymentId: row.id,
        bookingId: row.bookingId,
        bookingCode: row.booking.bookingCode,
        provider: PROVIDER_BY_METHOD[row.method],
        method: row.method,
        paymentStatus: row.status,
        bookingStatus: row.booking.status,
        mismatch,
        amount: row.amount.toNumber(),
        createdAt: row.createdAt,
      });
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  private toAdminPayment(row: AdminPaymentRow, now: Date): AdminPayment {
    return {
      id: row.id,
      bookingCode: row.booking.bookingCode,
      provider: PROVIDER_BY_METHOD[row.method],
      method: row.method,
      status: row.status,
      amount: row.amount.toNumber(),
      risk: deriveRisk(row.status, row.createdAt, now),
      transactionRef: row.transactionRef,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export const paymentAdminService = new PaymentAdminService();
