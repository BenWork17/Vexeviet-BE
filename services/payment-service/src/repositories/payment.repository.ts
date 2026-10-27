import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';

/** Row shape returned by the admin list query. */
export type AdminPaymentRow = Prisma.PaymentGetPayload<{
  include: { booking: { select: { bookingCode: true } } };
}>;

/**
 * Booking ownership needed by the owner-or-admin guard. Returns null when the
 * booking does not exist, so callers can answer 404 rather than 403.
 */
export interface BookingOwnerRow {
  userId: string;
  operatorId: string;
}

/** One completed payment's timestamp + amount, for the daily trend. */
export interface CompletedPaymentPoint {
  createdAt: Date;
  amount: Prisma.Decimal;
}

/** One `status` → count bucket for the admin summary. */
export interface AdminPaymentCountRow {
  status: PaymentStatus;
  count: number;
}

export class PaymentRepository {
  async create(data: Prisma.PaymentCreateInput): Promise<Payment> {
    return prisma.payment.create({ data });
  }

  async findById(id: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        booking: true,
        transactions: true,
      },
    });
  }

  async findByTransactionRef(transactionRef: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { transactionRef },
      include: {
        booking: true,
        transactions: true,
      },
    });
  }

  async findByBookingId(bookingId: string): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { bookingId },
      include: {
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    additionalData?: { paidAt?: Date; paymentUrl?: string },
    tx?: Prisma.TransactionClient
  ): Promise<Payment> {
    const client = tx || prisma;
    return client.payment.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    });
  }

  async findExpiredPayments(): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        expiredAt: {
          lt: new Date(),
        },
      },
    });
  }

  async markAsExpired(ids: string[]): Promise<Prisma.BatchPayload> {
    return prisma.payment.updateMany({
      where: {
        id: { in: ids },
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.EXPIRED,
      },
    });
  }

  async findByStatus(status: PaymentStatus, limit = 100): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { status },
      include: {
        booking: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getTotalPaidByBookingId(bookingId: string): Promise<number> {
    const result = await prisma.payment.aggregate({
      where: {
        bookingId,
        status: PaymentStatus.COMPLETED,
      },
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount?.toNumber() || 0;
  }

  /**
   * Booking ownership for the owner-or-admin guard, reached through
   * booking → route so an OPERATOR can be matched on `route.operatorId`.
   */
  async findBookingOwner(bookingId: string): Promise<BookingOwnerRow | null> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        userId: true,
        route: { select: { operatorId: true } },
      },
    });

    if (!booking) return null;

    return { userId: booking.userId, operatorId: booking.route.operatorId };
  }

  /** Same lookup keyed by the payment row, for `/:paymentId` routes. */
  async findBookingOwnerByPaymentId(paymentId: string): Promise<BookingOwnerRow | null> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        booking: {
          select: {
            userId: true,
            route: { select: { operatorId: true } },
          },
        },
      },
    });

    if (!payment) return null;

    return {
      userId: payment.booking.userId,
      operatorId: payment.booking.route.operatorId,
    };
  }

  /**
   * Booking ownership for a payment looked up by its `transactionRef`
   * (the `GET /status` route).
   */
  async findBookingOwnerByTransactionRef(transactionRef: string): Promise<BookingOwnerRow | null> {
    const payment = await prisma.payment.findUnique({
      where: { transactionRef },
      select: {
        booking: {
          select: {
            userId: true,
            route: { select: { operatorId: true } },
          },
        },
      },
    });

    if (!payment) return null;

    return {
      userId: payment.booking.userId,
      operatorId: payment.booking.route.operatorId,
    };
  }

  /**
   * Paginated admin listing. The booking join supplies `bookingCode`, and the
   * `operatorId` scope is applied on `booking.route.operatorId` so an OPERATOR
   * query param can never widen it.
   */
  async findManyAdmin(
    where: Prisma.PaymentWhereInput,
    skip: number,
    take: number
  ): Promise<AdminPaymentRow[]> {
    return prisma.payment.findMany({
      where,
      include: {
        booking: { select: { bookingCode: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  /**
   * Completed payments' `createdAt`/`amount` inside the window.
   *
   * Aggregated as calendar days in the service, in the app's local timezone.
   * Doing this in JS (rather than SQL `DATE_FORMAT`) keeps the day keys aligned
   * with the JS-computed window bounds regardless of the MySQL server timezone.
   * Bounded by the 90-day window clamp.
   */
  async findCompletedAmountsInWindow(
    where: Prisma.PaymentWhereInput
  ): Promise<CompletedPaymentPoint[]> {
    return prisma.payment.findMany({
      where,
      select: { createdAt: true, amount: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Row count for the admin list's `pagination.total`. */
  async countAdmin(where: Prisma.PaymentWhereInput): Promise<number> {
    return prisma.payment.count({ where });
  }

  /** Status histogram inside the summary window, for `countByStatus`. */
  async countByStatusAdmin(where: Prisma.PaymentWhereInput): Promise<AdminPaymentCountRow[]> {
    const rows = await prisma.payment.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    return rows.map((row) => ({ status: row.status, count: row._count._all }));
  }
}

export const paymentRepository = new PaymentRepository();
