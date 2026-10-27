import { prisma, Prisma, Booking, BookingStatus, PaymentStatus, RouteStatus, UserRole, UserStatus } from '@vexeviet/database';

/**
 * Relations loaded for the admin booking list.
 *
 * Everything the contract's AdminBooking shape needs is pulled in one
 * `findMany`: the `booking → route → operator` join, the customer, the seats and
 * the single most recent payment. Prisma batches these relation loads, so the
 * page costs a bounded number of queries (not one per row).
 */
const adminBookingInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  },
  route: {
    select: {
      id: true,
      name: true,
      origin: true,
      destination: true,
      operatorId: true,
      operator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  seats: {
    select: {
      seatNumber: true,
    },
  },
  passengers: {
    select: {
      seatNumber: true,
    },
  },
  payments: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      status: true,
      createdAt: true,
    },
  },
} satisfies Prisma.BookingInclude;

/** A booking row as loaded for the admin list. */
export type AdminBookingRow = Prisma.BookingGetPayload<{
  include: typeof adminBookingInclude;
}>;

/** One day bucket of completed-payment revenue. */
export interface RevenueTrendRow {
  day: string; // YYYY-MM-DD as produced by MySQL DATE_FORMAT
  total: Prisma.Decimal | null;
}

export class BookingRepository {
  /**
   * Create a new booking with passengers and seats
   */
  async create(
    data: Prisma.BookingCreateInput,
    passengers: Prisma.BookingPassengerCreateManyBookingInput[],
    _seats?: Omit<Prisma.BookingSeatCreateManyBookingInput, 'bookingId'>[]
  ): Promise<Booking & { passengers: { id: string; seatNumber: string }[] }> {
    return prisma.booking.create({
      data: {
        ...data,
        passengers: {
          createMany: {
            data: passengers,
          },
        },
      },
      include: {
        passengers: {
          select: {
            id: true,
            seatNumber: true,
          },
        },
      },
    });
  }

  /**
   * Find booking by ID with relations
   */
  async findById(id: string): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
            departureLocation: true,
            arrivalLocation: true,
            departureTime: true,
            arrivalTime: true,
            duration: true,
            busType: true,
            price: true,
            operator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        passengers: true,
        seats: true,
      },
    });
  }

  /**
   * Find booking by booking code
   */
  async findByCode(bookingCode: string): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: { bookingCode },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
            departureLocation: true,
            arrivalLocation: true,
            departureTime: true,
            arrivalTime: true,
            duration: true,
            busType: true,
            price: true,
            operator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        passengers: true,
        seats: true,
      },
    });
  }

  /**
   * Find booking by idempotency key
   */
  async findByIdempotencyKey(key: string): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: { idempotencyKey: key },
      include: {
        passengers: true,
        seats: true,
      },
    });
  }

  /**
   * Find many bookings with pagination
   */
  async findMany(params: {
    where?: Prisma.BookingWhereInput;
    orderBy?: Prisma.BookingOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<Booking[]> {
    return prisma.booking.findMany({
      ...params,
      include: {
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
            departureTime: true,
            arrivalTime: true,
            busType: true,
          },
        },
        passengers: {
          select: {
            firstName: true,
            lastName: true,
            seatNumber: true,
          },
        },
      },
    });
  }

  /**
   * Count bookings
   */
  async count(where?: Prisma.BookingWhereInput): Promise<number> {
    return prisma.booking.count({ where });
  }

  /**
   * Update booking
   */
  async update(id: string, data: Prisma.BookingUpdateInput): Promise<Booking> {
    return prisma.booking.update({
      where: { id },
      data,
      include: {
        passengers: true,
        seats: true,
      },
    });
  }

  /**
   * Update booking status
   */
  async updateStatus(
    id: string,
    status: BookingStatus,
    additionalData?: Partial<{
      confirmedAt: Date;
      cancelledAt: Date;
      cancellationReason: string;
    }>
  ): Promise<Booking> {
    return prisma.booking.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    });
  }

  /**
   * Find user's bookings
   */
  async findByUserId(
    userId: string,
    skip?: number,
    take?: number
  ): Promise<Booking[]> {
    return prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
            departureTime: true,
            arrivalTime: true,
            busType: true,
          },
        },
        passengers: {
          select: {
            firstName: true,
            lastName: true,
            seatNumber: true,
          },
        },
      },
    });
  }

  /**
   * Find expired pending bookings
   */
  async findExpiredPendingBookings(): Promise<Booking[]> {
    return prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        paymentDeadline: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * Expire bookings (batch update)
   */
  async expireBookings(bookingIds: string[]): Promise<number> {
    const result = await prisma.booking.updateMany({
      where: {
        id: { in: bookingIds },
        status: BookingStatus.PENDING,
      },
      data: {
        status: BookingStatus.EXPIRED,
      },
    });
    return result.count;
  }

  // =====================================================
  // ADMIN QUERIES
  // =====================================================

  /**
   * One page of the admin booking list.
   *
   * Single `findMany`: customer, `route → operator`, seats, passengers and the
   * latest payment are all relation loads batched by Prisma, so the page costs a
   * bounded number of round-trips regardless of row count.
   */
  async findAdminPage(params: {
    where: Prisma.BookingWhereInput;
    orderBy: Prisma.BookingOrderByWithRelationInput;
    skip: number;
    take: number;
  }): Promise<AdminBookingRow[]> {
    return prisma.booking.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: adminBookingInclude,
    });
  }

  /** Total rows matching the admin list filters (same `where` as `findAdminPage`). */
  async countAdmin(where: Prisma.BookingWhereInput): Promise<number> {
    return prisma.booking.count({ where });
  }

  /**
   * Booking IDs whose **most recent** payment has `status`.
   *
   * This is the `paymentStatus` filter for the admin list. It is the same rule
   * the response field uses ("latest payment by createdAt desc"), which Prisma's
   * relation filters (`some`/`every`) cannot express exactly — `some` would match
   * an older payment, and `every` cannot compare against the newest row.
   *
   * One window-function query; no per-row lookups. Window functions need MySQL 8
   * (the schema already relies on modern MySQL elsewhere).
   */
  async findIdsByLatestPaymentStatus(status: PaymentStatus): Promise<string[]> {
    const rows = await prisma.$queryRaw<{ bookingId: string }[]>`
      SELECT latest.bookingId
      FROM (
        SELECT bookingId, status,
               ROW_NUMBER() OVER (PARTITION BY bookingId ORDER BY createdAt DESC, id DESC) AS rn
        FROM payments
      ) latest
      WHERE latest.rn = 1 AND latest.status = ${status}
    `;

    return rows.map(row => row.bookingId);
  }

  /** Bookings created at/after `since` (dashboard "today" tile). */
  async countCreatedSince(since: Date): Promise<number> {
    return prisma.booking.count({ where: { createdAt: { gte: since } } });
  }

  /** Booking counts grouped by status, restricted to a created-at window. */
  async countByStatusSince(since: Date): Promise<{ status: BookingStatus; count: number }[]> {
    const groups = await prisma.booking.groupBy({
      by: ['status'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });

    return groups.map(group => ({ status: group.status, count: group._count._all }));
  }

  /** Sum of COMPLETED payment amounts in `[from, to)`, as a Decimal (no float math). */
  async sumCompletedPayments(from: Date, to: Date): Promise<Prisma.Decimal> {
    const result = await prisma.payment.aggregate({
      where: {
        status: PaymentStatus.COMPLETED,
        createdAt: { gte: from, lt: to },
      },
      _sum: { amount: true },
    });

    return result._sum.amount ?? new Prisma.Decimal(0);
  }

  /** Payments still needing an operator action (PENDING or FAILED) in `[from, to)`. */
  async countPaymentsNeedingAction(from: Date, to: Date): Promise<number> {
    return prisma.payment.count({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
        createdAt: { gte: from, lt: to },
      },
    });
  }

  /** Active routes across the platform. */
  async countActiveRoutes(): Promise<number> {
    return prisma.route.count({ where: { status: RouteStatus.ACTIVE } });
  }

  /** Active users holding the OPERATOR role. */
  async countActiveOperators(): Promise<number> {
    return prisma.user.count({
      where: { role: UserRole.OPERATOR, status: UserStatus.ACTIVE },
    });
  }

  /**
   * Completed-payment revenue bucketed per **local** calendar day over `[from, to)`.
   *
   * Grouping by day is not expressible through Prisma's `groupBy`, so this is one
   * raw aggregate query. `SUM` stays in SQL — Decimals are never summed as floats
   * in JS. `offsetMinutes` (minutes east of UTC) is added before formatting so the
   * buckets line up with the `YYYY-MM-DD` labels the service derives from local
   * midnight; without it a UTC+7 deployment would attribute early-morning revenue
   * to the previous day. `CONVERT_TZ` is avoided because it depends on the MySQL
   * time-zone tables being loaded.
   */
  async findRevenueTrend(
    from: Date,
    to: Date,
    offsetMinutes: number
  ): Promise<RevenueTrendRow[]> {
    return prisma.$queryRaw<RevenueTrendRow[]>`
      SELECT DATE_FORMAT(DATE_ADD(createdAt, INTERVAL ${offsetMinutes} MINUTE), '%Y-%m-%d') AS day,
             SUM(amount) AS total
      FROM payments
      WHERE status = 'COMPLETED' AND createdAt >= ${from} AND createdAt < ${to}
      GROUP BY day
      ORDER BY day ASC
    `;
  }
}
