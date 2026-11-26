import {
  prisma,
  Prisma,
  BookingStatus,
  PaymentStatus,
  RouteStatus,
  SeatStatus,
  UserRole,
  UserStatus,
} from '@vexeviet/database';
import { bookingDetailInclude, BookingDetailRow } from './booking.repository';

export const adminBookingInclude = {
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

export type AdminBookingRow = Prisma.BookingGetPayload<{
  include: typeof adminBookingInclude;
}>;

export interface AdminCancelTargetRow {
  id: string;
  bookingCode: string;
  status: BookingStatus;
}

export interface AdminConfirmTargetRow {
  id: string;
  bookingCode: string;
  status: BookingStatus;
}

export interface AdminConfirmManyResult {
  confirmedIds: string[];
  skippedIds: string[];
  seatsConfirmedByBookingId: Record<string, number>;
}

export interface RevenueTrendRow {
  day: string;
  total: Prisma.Decimal | null;
}

export class BookingAdminRepository {
  async findAdminPage(params: {
    where: Prisma.BookingWhereInput;
    orderBy: Prisma.BookingOrderByWithRelationInput;
    skip: number;
    take: number;
  }): Promise<AdminBookingRow[]> {
    const bookings = await prisma.booking.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
    });

    if (bookings.length === 0) {
      return [];
    }

    const bookingIds = bookings.map((b) => b.id);
    const userIds = Array.from(new Set(bookings.map((b) => b.userId)));
    const routeIds = Array.from(new Set(bookings.map((b) => b.routeId)));

    const [users, routeRows, seatRows, passengerRows, latestPaymentRows] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      }),
      prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
          origin: string;
          destination: string;
          operatorId: string;
          opId: string;
          opFirstName: string;
          opLastName: string;
        }>
      >`
        SELECT r.id, r.name, r.origin, r.destination, r.operatorId,
               u.id AS opId, u.firstName AS opFirstName, u.lastName AS opLastName
        FROM routes r
        INNER JOIN users u ON u.id = r.operatorId
        WHERE r.id IN (${Prisma.join(routeIds)})
      `,
      prisma.bookingSeat.findMany({
        where: { bookingId: { in: bookingIds } },
        select: { bookingId: true, seatNumber: true },
      }),
      prisma.bookingPassenger.findMany({
        where: { bookingId: { in: bookingIds } },
        select: { bookingId: true, seatNumber: true },
      }),
      prisma.$queryRaw<
        Array<{
          bookingId: string;
          status: PaymentStatus;
          createdAt: Date;
        }>
      >`
        SELECT latest.bookingId, latest.status, latest.createdAt
        FROM (
          SELECT bookingId, status, createdAt,
                 ROW_NUMBER() OVER (PARTITION BY bookingId ORDER BY createdAt DESC, id DESC) AS rn
          FROM payments
          WHERE bookingId IN (${Prisma.join(bookingIds)})
        ) latest
        WHERE latest.rn = 1
      `,
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const routeMap = new Map(
      routeRows.map((r) => [
        r.id,
        {
          id: r.id,
          name: r.name,
          origin: r.origin,
          destination: r.destination,
          operatorId: r.operatorId,
          operator: {
            id: r.opId,
            firstName: r.opFirstName,
            lastName: r.opLastName,
          },
        },
      ])
    );

    const seatsByBooking = new Map<string, Array<{ seatNumber: string }>>();
    for (const row of seatRows) {
      if (!row.bookingId) continue;
      let list = seatsByBooking.get(row.bookingId);
      if (!list) {
        list = [];
        seatsByBooking.set(row.bookingId, list);
      }
      list.push({ seatNumber: row.seatNumber });
    }

    const passengersByBooking = new Map<string, Array<{ seatNumber: string }>>();
    for (const row of passengerRows) {
      let list = passengersByBooking.get(row.bookingId);
      if (!list) {
        list = [];
        passengersByBooking.set(row.bookingId, list);
      }
      list.push({ seatNumber: row.seatNumber });
    }

    const paymentByBooking = new Map<string, Array<{ status: PaymentStatus; createdAt: Date }>>();
    for (const row of latestPaymentRows) {
      paymentByBooking.set(row.bookingId, [
        {
          status: row.status,
          createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
        },
      ]);
    }

    return bookings
      .map((booking): AdminBookingRow | null => {
        const user = userMap.get(booking.userId);
        const route = routeMap.get(booking.routeId);
        if (!user || !route) {
          return null;
        }
        return {
          ...booking,
          user,
          route,
          seats: seatsByBooking.get(booking.id) ?? [],
          passengers: passengersByBooking.get(booking.id) ?? [],
          payments: paymentByBooking.get(booking.id) ?? [],
        };
      })
      .filter((row): row is AdminBookingRow => row !== null);
  }

  async countAdmin(where: Prisma.BookingWhereInput): Promise<number> {
    return prisma.booking.count({ where });
  }

  async findIdsByLatestPaymentStatus(status: PaymentStatus): Promise<string[]> {
    return this.queryIdsByLatestPaymentStatus(status, null);
  }

  /**
   * Returns ONLY bookings that had at least one payment of `status` in the past
   * whose *latest* payment is now a different status. Combined with
   * `where.payments = { some: { status } }` and `where.id = { notIn: ... }`,
   * this produces the exact latest-payment filter without shipping thousands of
   * matching booking UUIDs over the wire.
   */
  async findSupersededBookingIdsForPaymentStatus(status: PaymentStatus): Promise<string[]> {
    const rows = await prisma.$queryRaw<{ bookingId: string }[]>`
      SELECT latest.bookingId
      FROM (
        SELECT bookingId, status,
               ROW_NUMBER() OVER (PARTITION BY bookingId ORDER BY createdAt DESC, id DESC) AS rn
        FROM payments
      ) latest
      WHERE latest.rn = 1
        AND latest.status <> ${status}
        AND EXISTS (
          SELECT 1
          FROM payments p2
          WHERE p2.bookingId = latest.bookingId
            AND p2.status = ${status}
        )
    `;

    return rows.map((row) => row.bookingId);
  }

  async findIdsWithLatestPaymentStatusAmong(
    status: PaymentStatus,
    ids: string[]
  ): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.queryIdsByLatestPaymentStatus(status, ids);
  }

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

    return rows.map((row) => row.bookingId);
  }

  async countCreatedSince(since: Date, operatorId?: string): Promise<number> {
    return prisma.booking.count({
      where: {
        createdAt: { gte: since },
        ...(operatorId ? { route: { operatorId } } : {}),
      },
    });
  }

  async countByStatusSince(
    since: Date,
    operatorId?: string
  ): Promise<{ status: BookingStatus; count: number }[]> {
    const groups = await prisma.booking.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: since },
        ...(operatorId ? { route: { operatorId } } : {}),
      },
      _count: { _all: true },
    });

    return groups.map((group) => ({ status: group.status, count: group._count._all }));
  }

  async sumCompletedPayments(
    from: Date,
    to: Date,
    operatorId?: string
  ): Promise<Prisma.Decimal> {
    const result = await prisma.payment.aggregate({
      where: {
        status: PaymentStatus.COMPLETED,
        createdAt: { gte: from, lt: to },
        ...(operatorId ? { booking: { route: { operatorId } } } : {}),
      },
      _sum: { amount: true },
    });

    return result._sum.amount ?? new Prisma.Decimal(0);
  }

  async countPaymentsNeedingAction(
    from: Date,
    to: Date,
    operatorId?: string
  ): Promise<number> {
    return prisma.payment.count({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
        createdAt: { gte: from, lt: to },
        ...(operatorId ? { booking: { route: { operatorId } } } : {}),
      },
    });
  }

  async countActiveRoutes(operatorId?: string): Promise<number> {
    return prisma.route.count({
      where: {
        status: RouteStatus.ACTIVE,
        ...(operatorId ? { operatorId } : {}),
      },
    });
  }

  async countActiveOperators(operatorId?: string): Promise<number> {
    return prisma.user.count({
      where: {
        role: UserRole.OPERATOR,
        status: UserStatus.ACTIVE,
        ...(operatorId ? { id: operatorId } : {}),
      },
    });
  }

  async findActorName(
    userId: string
  ): Promise<{ firstName: string | null; lastName: string | null; email: string } | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });
  }

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

  async updateNotes(bookingId: string, notes: string | null): Promise<BookingDetailRow> {
    return prisma.booking.update({
      where: { id: bookingId },
      data: { notes },
      include: bookingDetailInclude,
    });
  }

  async findCancelTargets(ids: string[]): Promise<AdminCancelTargetRow[]> {
    return prisma.booking.findMany({
      where: { id: { in: ids } },
      select: { id: true, bookingCode: true, status: true },
    });
  }

  async cancelManyAsAdmin(
    targets: AdminCancelTargetRow[],
    reason: string
  ): Promise<{ cancelledIds: string[]; skippedIds: string[] }> {
    return prisma.$transaction(async (tx) => {
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

  async findConfirmTargets(ids: string[]): Promise<AdminConfirmTargetRow[]> {
    return prisma.booking.findMany({
      where: { id: { in: ids } },
      select: { id: true, bookingCode: true, status: true },
    });
  }

  async confirmManyAsAdmin(targets: AdminConfirmTargetRow[]): Promise<AdminConfirmManyResult> {
    return prisma.$transaction(async (tx) => {
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

  async findRevenueTrend(
    from: Date,
    to: Date,
    offsetMinutes: number,
    operatorId?: string
  ): Promise<RevenueTrendRow[]> {
    if (operatorId) {
      return prisma.$queryRaw<RevenueTrendRow[]>`
        SELECT DATE_FORMAT(DATE_ADD(p.createdAt, INTERVAL ${offsetMinutes} MINUTE), '%Y-%m-%d') AS day,
               SUM(p.amount) AS total
        FROM payments p
        INNER JOIN bookings b ON b.id = p.bookingId
        INNER JOIN routes r ON r.id = b.routeId
        WHERE p.status = 'COMPLETED' AND p.createdAt >= ${from} AND p.createdAt < ${to}
          AND r.operatorId = ${operatorId}
        GROUP BY day
        ORDER BY day ASC
      `;
    }

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
