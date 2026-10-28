import { v4 as uuidv4 } from 'uuid';
import { BookingStatus, PaymentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { writeAuditLog } from '@vexeviet/database';
import { paymentConfig } from '../config';
import {
  CreatePaymentRequest,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
  PaymentDTO,
  PaymentStatusResponse,
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
  BookingOwnerRow,
  CompletedPaymentPoint,
} from '../repositories/payment.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import { vnpayService } from './vnpay.service';
import {
  BookingSyncError,
  BookingSyncUnavailableError,
  bookingSyncService,
  resolveBookingSyncTarget,
} from './booking-sync.service';
import { generateTransactionRef } from '../utils/signature';
import {
  getIdempotencyRecord,
  setIdempotencyRecord,
} from '../utils/idempotency';
import { PaymentError } from '../middlewares/error.middleware';

/** Display mapping for contract Shape 2. Kept exhaustive over PaymentMethod. */
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

/** `YYYY-MM-DD` in the app's local timezone. */
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

/** Calendar-day arithmetic in local time (DST-safe, avoids ms maths). */
const addDays = (date: Date, delta: number): Date => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + delta);
  return next;
};

const minutesSince = (from: Date, now: Date): number => (now.getTime() - from.getTime()) / 60000;

/**
 * Contract Shape 2 risk label, derived at read time:
 * FAILED / REFUNDED are urgent; a PENDING older than 15min or a PROCESSING older
 * than 30min is on watch; everything else is normal.
 */
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

/**
 * Reconciliation label for a payment/booking pair, or `null` when they agree.
 *
 * Mirrors the SQL rule in `RECONCILIATION_WHERE`; a row the filter allowed but
 * this returns `null` for (a status change between the two statements) is
 * dropped rather than reported with a wrong label. Exported so the two
 * definitions can be proven equivalent across every status pair.
 *
 * REFUNDED/PARTIALLY_REFUNDED never produce a label: a refund does not change
 * the booking, so calling it a mismatch would flag every legitimate refund.
 * That reasoning is what keeps a refund against a CANCELLED booking out of the
 * `PAID_BUT_CANCELLED` label too — refunding a cancelled trip is the correct
 * outcome, not a fault. Only COMPLETED (money still held) is labelled there.
 */
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

/**
 * Zero-filled daily completed-amount series over the whole window, so the admin
 * chart has one point per calendar day even on days with no payments.
 */
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
    // Points outside the zero-filled window are dropped rather than appended.
    if (current !== undefined) {
      totals.set(key, current + point.amount.toNumber());
    }
  }

  return Array.from(totals, ([label, value]) => ({ label, value }));
};

export class PaymentService {
  private isFinalStatus(status: PaymentStatus): boolean {
    return (
      status === PaymentStatus.COMPLETED ||
      status === PaymentStatus.FAILED ||
      status === PaymentStatus.CANCELLED ||
      status === PaymentStatus.EXPIRED ||
      status === PaymentStatus.REFUNDED ||
      status === PaymentStatus.PARTIALLY_REFUNDED
    );
  }

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

  async getPaymentStatusByTransactionRef(transactionRef: string): Promise<PaymentStatusResponse | null> {
    const payment = await paymentRepository.findByTransactionRef(transactionRef);

    if (!payment) {
      return null;
    }

    return {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      transactionRef: payment.transactionRef,
      status: payment.status,
      isFinal: this.isFinalStatus(payment.status),
      paidAt: payment.paidAt,
      expiredAt: payment.expiredAt,
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

  async processRefund(data: RefundRequest, actor: TokenPayload): Promise<RefundResponse> {
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

    // Non-throwing helper: an audit failure must never fail the refund.
    await writeAuditLog({
      actorId: actor.userId,
      actorName: actor.email || actor.userId,
      actorRole: actor.role,
      action: 'PAYMENT_REFUNDED',
      target: `payment:${payment.id}`,
      targetId: payment.id,
      severity: 'WARNING',
      metadata: {
        amount: refundAmount,
        bookingId: payment.bookingId,
        transactionRef: payment.transactionRef,
        refundId: refundTransaction.id,
        reason: data.reason,
      },
    });

    return {
      success: true,
      refundId: refundTransaction.id,
      amount: refundAmount,
      status: refundTransaction.status,
      message: 'Refund initiated successfully',
    };
  }

  /** Booking ownership for the owner-or-admin guard. Null when the booking is unknown. */
  async getBookingOwner(bookingId: string): Promise<BookingOwnerRow | null> {
    return paymentRepository.findBookingOwner(bookingId);
  }

  async getBookingOwnerByPaymentId(paymentId: string): Promise<BookingOwnerRow | null> {
    return paymentRepository.findBookingOwnerByPaymentId(paymentId);
  }

  async getBookingOwnerByTransactionRef(transactionRef: string): Promise<BookingOwnerRow | null> {
    return paymentRepository.findBookingOwnerByTransactionRef(transactionRef);
  }

  /**
   * Admin list (contract Shape 2). Message-free filtering lives here so the
   * repository stays a thin Prisma wrapper.
   *
   * `filters.operatorId` is always derived by the caller from the token, never
   * from a query param, so an OPERATOR cannot widen its scope.
   */
  async listAdminPayments(
    filters: AdminPaymentListFilters,
    page: number,
    limit: number
  ): Promise<{ data: AdminPayment[]; pagination: Pagination }> {
    const createdAt =
      filters.from || filters.to
        ? {
            ...(filters.from ? { gte: filters.from } : {}),
            // `to` is a date bound: include the whole day.
            ...(filters.to ? { lte: endOfDay(filters.to) } : {}),
          }
        : undefined;

    // `bookingCode` and the operator scope are both relations off `booking`;
    // they must be merged into one object or the second spread would drop the
    // first. `method` is resolved once so `provider` cannot silently override a
    // conflicting explicit `method` (the validator rejects that pair).
    const resolvedMethod = filters.method ?? (filters.provider ? PROVIDER_TO_METHOD[filters.provider] : undefined);

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

  /**
   * Admin summary (contract Shape 2). Window is the last `days` calendar days,
   * inclusive of today, and the daily trend is zero-filled across the whole window.
   */
  async getAdminPaymentSummary(days: number): Promise<AdminPaymentSummary> {
    const now = new Date();
    const from = startOfDay(addDays(now, -(days - 1)));

    // Summary is ADMIN-only, so the window is never operator-scoped. Both bounds
    // are required: without the upper bound a future-dated row would be counted in
    // `totalCompleted`/`countByStatus` but dropped by the zero-filled trend.
    const windowWhere: Prisma.PaymentWhereInput = {
      createdAt: { gte: from, lte: endOfDay(now) },
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

  /**
   * Admin manual repair: re-drive the payment→booking status sync.
   *
   * Only statuses that *have* a booking transition can be re-driven; REFUNDED in
   * particular is refused up front, because re-syncing it would cancel a
   * confirmed booking.
   *
   * The downstream 409 means the booking is already ahead of the payment (e.g.
   * `markPaymentFailed` refuses a CONFIRMED booking). That is the healthy
   * outcome of a retry, not a server error, so it is reported as
   * `alreadyConsistent` with a 200.
   */
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
      // A 409 from booking-service means the booking is already ahead of the
      // payment: there is nothing to repair, so report success.
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

      const downstreamStatus =
        error instanceof BookingSyncError ? error.status : undefined;

      await writeAuditLog({
        ...auditBase,
        metadata: {
          paymentStatus: payment.status,
          intendedBookingAction: target.action,
          outcome: 'failed',
          ...(downstreamStatus !== undefined ? { downstreamStatus } : {}),
        },
      });

      // 401/503 is P1's fail-closed internal-key guard: the operator needs to
      // read this as a deploy problem, not as a payment problem.
      if (error instanceof BookingSyncError && (error.status === 401 || error.status === 503)) {
        throw new PaymentError(
          `Booking service rejected the internal API call (status ${error.status}). The internal API key is probably unconfigured or wrong — check BOOKING_SERVICE_INTERNAL_API_KEY.`,
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

  /**
   * Read-only reconciliation report.
   *
   * Two statements regardless of page size: `findManyReconciliation` (the
   * mismatch rule is a SQL relation filter, so `skip`/`take` bound the scan and
   * the booking is joined in) and `countReconciliation`. Never a query per row.
   *
   * No audit row: this is a pure read, and auditing every page view would let a
   * read fill the audit table.
   */
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
      // The SQL filter and this mapper apply the same rule; the guard keeps the
      // row out of the payload with a *wrong* label rather than guessing.
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
