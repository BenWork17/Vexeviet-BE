import { prisma, Prisma, Booking, BookingStatus, PaymentStatus, RouteStatus, SeatStatus, UserRole, UserStatus } from '@vexeviet/database';

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

/**
 * Relations loaded whenever a booking is returned as a detail response.
 *
 * Shared by the read paths and the admin notes write, so an update can return
 * the same shape as a read in a single round-trip instead of write-then-refetch.
 */
const bookingDetailInclude = {
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
} satisfies Prisma.BookingInclude;

/** A booking row as loaded for a detail response. */
export type BookingDetailRow = Prisma.BookingGetPayload<{
  include: typeof bookingDetailInclude;
}>;

/** The fields a cancel action needs from a booking, plus its booking code. */
export interface AdminCancelTargetRow {
  id: string;
  bookingCode: string;
  status: BookingStatus;
}

/** The fields a confirm action needs from a booking, plus its booking code. */
export interface AdminConfirmTargetRow {
  id: string;
  bookingCode: string;
  status: BookingStatus;
}

/** Outcome of the guarded bulk confirm, per row. */
export interface AdminConfirmManyResult {
  /** Rows this call actually moved to `CONFIRMED` (the guard matched). */
  confirmedIds: string[];
  /** Rows whose status had moved on between the read and the guard. */
  skippedIds: string[];
  /** `HELD → BOOKED` rows moved, per confirmed booking id. Zero is possible. */
  seatsConfirmedByBookingId: Record<string, number>;
}

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
    return this.queryIdsByLatestPaymentStatus(status, null);
  }

  /**
   * The same latest-payment rule as `findIdsByLatestPaymentStatus`, restricted
   * to `ids`.
   *
   * Deliberately one shared implementation: the admin bulk confirm and the admin
   * list must agree on what "paid" means, or the screen offers a row it labels
   * paid and the endpoint refuses it. `payments: { some: { status } }` is *not*
   * that rule — it matches an older payment and would disagree here.
   */
  async findIdsWithLatestPaymentStatusAmong(
    status: PaymentStatus,
    ids: string[]
  ): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.queryIdsByLatestPaymentStatus(status, ids);
  }

  /**
   * The one definition of "latest payment": newest by `createdAt DESC, id DESC`.
   *
   * `restrictIds` only narrows the outer join; it never changes the ordering, so
   * the answer for a given booking is identical whichever entry point is used.
   */
  private async queryIdsByLatestPaymentStatus(
    status: PaymentStatus,
    restrictIds: string[] | null
  ): Promise<string[]> {
    const restriction =
      restrictIds === null
        ? Prisma.empty
        : Prisma.sql`AND latest.bookingId IN (${Prisma.join(restrictIds)})`;

    const rows = await prisma.$queryRaw<{ bookingId: string }[]>`
      SELECT latest.bookingId
      FROM (
        SELECT bookingId, status,
               ROW_NUMBER() OVER (PARTITION BY bookingId ORDER BY createdAt DESC, id DESC) AS rn
        FROM payments
      ) latest
      WHERE latest.rn = 1 AND latest.status = ${status}
      ${restriction}
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

  // =====================================================
  // ADMIN WRITE PATHS
  // =====================================================

  /**
   * Display name for the audit row of an admin action.
   *
   * One select, called once per request (not per batch item). `null` when the
   * user row is gone; the caller then falls back to the token's email, because
   * `writeAuditLog` silently drops rows with a null `actorName`.
   */
  async findActorName(
    userId: string
  ): Promise<{ firstName: string | null; lastName: string | null; email: string } | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });
  }

  /**
   * Cancel one booking on behalf of an admin and return the full detail row.
   *
   * `expectedStatus` is part of the `where`, so the write is atomic with the
   * caller's read: if the row moved on in between (say a payment confirmed or
   * completed it), nothing is written and Prisma raises P2025 instead of
   * cancelling a booking whose state the caller never saw. The service maps that
   * to a conflict.
   *
   * The detail relations are included so the response needs no refetch.
   */
  async cancelAsAdmin(
    bookingId: string,
    expectedStatus: BookingStatus,
    reason: string
  ): Promise<BookingDetailRow> {
    return prisma.booking.update({
      where: { id: bookingId, status: expectedStatus },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
      include: bookingDetailInclude,
    });
  }

  /**
   * Set or clear `Booking.notes` and return the fresh detail row.
   *
   * Only `notes` is written: status, payment status, seats and money are
   * untouched by construction.
   */
  async updateNotes(bookingId: string, notes: string | null): Promise<BookingDetailRow> {
    return prisma.booking.update({
      where: { id: bookingId },
      data: { notes },
      include: bookingDetailInclude,
    });
  }

  /**
   * Load the cancel-relevant fields for a batch of booking ids.
   *
   * One query for the whole batch — never a `findById` per id.
   */
  async findCancelTargets(ids: string[]): Promise<AdminCancelTargetRow[]> {
    return prisma.booking.findMany({
      where: { id: { in: ids } },
      select: { id: true, bookingCode: true, status: true },
    });
  }

  /**
   * Cancel a batch of bookings in one transaction.
   *
   * Each row is updated with `where: { id, status: <status we read> }`, so an
   * update only lands if the row is still in the state the caller classified.
   * That guard is what makes the audit trail truthful: a booking cancelled by a
   * concurrent writer between the read and this write returns `count: 0` and is
   * reported as skipped instead of being claimed by this admin.
   *
   * A single guarded `updateMany` would cost one statement but cannot say
   * *which* rows it transitioned when the count comes up short, so it could
   * attribute another admin's cancellation to this actor, with a reason that
   * never reached the row.
   *
   * Statements: one `updateMany` per target (≤50, primary-key equality) plus one
   * `deleteMany` releasing the seats of the rows that did transition. All inside
   * one transaction, so status and seats cannot diverge.
   */
  async cancelManyAsAdmin(
    targets: AdminCancelTargetRow[],
    reason: string
  ): Promise<{ cancelledIds: string[]; skippedIds: string[] }> {
    return prisma.$transaction(async tx => {
      const cancelledIds: string[] = [];
      const skippedIds: string[] = [];
      const cancelledAt = new Date();

      for (const target of targets) {
        const updated = await tx.booking.updateMany({
          where: { id: target.id, status: target.status },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt,
            cancellationReason: reason,
          },
        });

        if (updated.count === 1) {
          cancelledIds.push(target.id);
        } else {
          skippedIds.push(target.id);
        }
      }

      if (cancelledIds.length > 0) {
        await tx.bookingSeat.deleteMany({
          where: {
            bookingId: { in: cancelledIds },
            status: { in: [SeatStatus.HELD, SeatStatus.BOOKED] },
          },
        });
      }

      return { cancelledIds, skippedIds };
    });
  }

  /**
   * Load the confirm-relevant fields for a batch of booking ids.
   *
   * One query for the whole batch — never a `findById` per id. Same shape as
   * `findCancelTargets`, and the same reason `status` is read here: it is the
   * value the guarded write below must match.
   */
  async findConfirmTargets(ids: string[]): Promise<AdminConfirmTargetRow[]> {
    return prisma.booking.findMany({
      where: { id: { in: ids } },
      select: { id: true, bookingCode: true, status: true },
    });
  }

  /**
   * Confirm a batch of bookings in one transaction.
   *
   * Each status write is guarded with `where: { id, status: <status we read> }`,
   * exactly like `cancelManyAsAdmin`, so a row that moved on between the
   * classification read and this write returns `count: 0` and is reported as
   * skipped instead of being claimed by this admin. Never `update` by id alone.
   *
   * Seats move in the *same* transaction as the status, so a booking can never
   * end up `CONFIRMED` with its seats left `HELD` (or vice versa). The seat count
   * is per booking and is allowed to be zero: `releaseExpiredHolds` deletes HELD
   * rows whose `lockedUntil` passed, so a paid booking can legitimately arrive
   * here with nothing left to lock. Returning the count — rather than assuming
   * success — is what lets the caller surface that exposure. Seats are never
   * re-acquired or re-priced here; that would be a different, un-authorised act.
   *
   * Statements: one `updateMany` (+ one seat `updateMany`) per target (≤50,
   * primary-key equality), all inside one transaction.
   */
  async confirmManyAsAdmin(targets: AdminConfirmTargetRow[]): Promise<AdminConfirmManyResult> {
    return prisma.$transaction(async tx => {
      const confirmedIds: string[] = [];
      const skippedIds: string[] = [];
      const seatsConfirmedByBookingId: Record<string, number> = {};
      const confirmedAt = new Date();

      for (const target of targets) {
        const updated = await tx.booking.updateMany({
          where: { id: target.id, status: target.status },
          data: {
            status: BookingStatus.CONFIRMED,
            confirmedAt,
          },
        });

        if (updated.count !== 1) {
          skippedIds.push(target.id);
          continue;
        }

        const seats = await tx.bookingSeat.updateMany({
          where: {
            bookingId: target.id,
            status: SeatStatus.HELD,
          },
          data: { status: SeatStatus.BOOKED },
        });

        confirmedIds.push(target.id);
        seatsConfirmedByBookingId[target.id] = seats.count;
      }

      return { confirmedIds, skippedIds, seatsConfirmedByBookingId };
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
