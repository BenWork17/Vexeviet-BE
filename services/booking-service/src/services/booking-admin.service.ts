import { BookingStatus, PaymentStatus, Prisma, writeAuditLog } from '@vexeviet/database';
import { createLogger } from '@vexeviet/common';
import {
  BookingRepository,
  type AdminCancelTargetRow,
  type AdminConfirmTargetRow,
  type BookingDetailRow,
} from '../repositories/booking.repository';
import { SeatRepository } from '../repositories/seat.repository';
import {
  AdminBooking,
  AdminBookingQuery,
  AdminBulkCancelItem,
  AdminBulkCancelResponse,
  AdminBulkConfirmItem,
  AdminBulkConfirmResponse,
  AdminDashboardStats,
  BookingDetailResponse,
  DashboardPoint,
  PaginatedResponse,
  TokenPayload,
} from '../types';
import { ConflictError, NotFoundError } from '../middlewares/error.middleware';
import {
  formatAdminBooking,
  formatBookingDetailResponse,
  formatLocalDate,
  parseDateEnd,
  parseDateStart,
} from './booking-formatters';

const logger = createLogger('booking-service:admin');

export class BookingAdminService {
  private bookingRepo: BookingRepository;
  private seatRepo: SeatRepository;

  constructor(
    bookingRepo = new BookingRepository(),
    seatRepo = new SeatRepository()
  ) {
    this.bookingRepo = bookingRepo;
    this.seatRepo = seatRepo;
  }

  async getAdminBookings(
    actor: TokenPayload,
    query: AdminBookingQuery
  ): Promise<PaginatedResponse<AdminBooking>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const where = this.buildAdminWhere(actor, query);

    if (query.paymentStatus) {
      const ids = await this.bookingRepo.findIdsByLatestPaymentStatus(query.paymentStatus);

      if (ids.length === 0) {
        return {
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }

      where.id = { in: ids };
    }

    const orderBy: Prisma.BookingOrderByWithRelationInput = this.buildAdminOrderBy(query.sort);

    const [rows, total] = await Promise.all([
      this.bookingRepo.findAdminPage({ where, orderBy, skip, take: limit }),
      this.bookingRepo.countAdmin(where),
    ]);

    return {
      data: rows.map((row) => formatAdminBooking(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAdminDashboard(days: number, actor: TokenPayload): Promise<AdminDashboardStats> {
    const { from, to, dayStarts } = this.buildWindow(days);
    const operatorId = actor.role === 'OPERATOR' ? actor.userId : undefined;

    const [
      todayBookings,
      revenueCompleted,
      paymentsNeedingAction,
      activeRoutes,
      operatorCount,
      revenueRows,
      statusGroups,
    ] = await Promise.all([
      this.bookingRepo.countCreatedSince(this.startOfToday(), operatorId),
      this.bookingRepo.sumCompletedPayments(from, to, operatorId),
      this.bookingRepo.countPaymentsNeedingAction(from, to, operatorId),
      this.bookingRepo.countActiveRoutes(operatorId),
      this.bookingRepo.countActiveOperators(operatorId),
      this.bookingRepo.findRevenueTrend(from, to, this.localUtcOffsetMinutes(from), operatorId),
      this.bookingRepo.countByStatusSince(from, operatorId),
    ]);

    const revenueByDay = new Map<string, Prisma.Decimal>();
    for (const row of revenueRows) {
      revenueByDay.set(row.day, row.total ?? new Prisma.Decimal(0));
    }

    const revenueTrend: DashboardPoint[] = dayStarts.map((day) => ({
      label: day.label,
      value: Math.round(Number(revenueByDay.get(day.label) ?? 0)),
    }));

    const bookingStatusSummary: DashboardPoint[] = statusGroups.map((group) => ({
      label: group.status,
      value: group.count,
    }));

    return {
      todayBookings,
      revenueCompleted: Math.round(Number(revenueCompleted)),
      paymentsNeedingAction,
      activeRoutes,
      operatorCount,
      revenueTrend,
      bookingStatusSummary,
    };
  }

  async cancelBookingAsAdmin(
    bookingId: string,
    actor: TokenPayload,
    reason: string
  ): Promise<BookingDetailResponse> {
    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking', bookingId);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictError('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new ConflictError('Cannot cancel completed booking');
    }

    const previousStatus = booking.status;
    let updatedBooking: BookingDetailRow;

    try {
      updatedBooking = await this.bookingRepo.cancelAsAdmin(bookingId, previousStatus, reason);
    } catch (error) {
      if (this.isRecordNotFound(error)) {
        throw new ConflictError('Booking status changed before it could be cancelled');
      }
      throw error;
    }

    await this.seatRepo.releaseSeatsByBookingId(bookingId);

    const auditActor = await this.resolveAuditActor(actor);

    await writeAuditLog({
      actorId: auditActor.actorId,
      actorName: auditActor.actorName,
      actorRole: auditActor.actorRole,
      action: 'BOOKING_CANCELLED',
      target: `booking:${booking.bookingCode}`,
      targetId: booking.id,
      severity: 'WARNING',
      metadata: {
        bookingCode: booking.bookingCode,
        previousStatus,
        reason,
        adminOverride: true,
      },
    });

    return formatBookingDetailResponse(updatedBooking);
  }

  async cancelBookingsAsAdmin(
    ids: string[],
    actor: TokenPayload,
    reason: string
  ): Promise<AdminBulkCancelResponse> {
    const targets = await this.bookingRepo.findCancelTargets(ids);
    const targetById = new Map(targets.map((target) => [target.id, target]));

    const results = new Map<string, AdminBulkCancelItem>();
    const cancellable: AdminCancelTargetRow[] = [];

    for (const id of ids) {
      const target = targetById.get(id);

      if (!target) {
        results.set(id, { id, ok: false, code: 'NOT_FOUND', message: 'Booking not found' });
        continue;
      }

      if (target.status === BookingStatus.CANCELLED) {
        results.set(id, {
          id,
          ok: false,
          code: 'CONFLICT',
          message: 'Booking is already cancelled',
        });
        continue;
      }

      if (target.status === BookingStatus.COMPLETED) {
        results.set(id, {
          id,
          ok: false,
          code: 'CONFLICT',
          message: 'Cannot cancel completed booking',
        });
        continue;
      }

      cancellable.push(target);
    }

    if (cancellable.length > 0) {
      const { cancelledIds, skippedIds } = await this.bookingRepo.cancelManyAsAdmin(
        cancellable,
        reason
      );

      if (cancelledIds.length > 0) {
        const auditActor = await this.resolveAuditActor(actor);

        for (const id of cancelledIds) {
          const target = targetById.get(id);
          if (!target) continue;

          results.set(id, { id, ok: true, status: 'CANCELLED' });

          await writeAuditLog({
            actorId: auditActor.actorId,
            actorName: auditActor.actorName,
            actorRole: auditActor.actorRole,
            action: 'BOOKING_CANCELLED',
            target: `booking:${target.bookingCode}`,
            targetId: target.id,
            severity: 'WARNING',
            metadata: {
              bookingCode: target.bookingCode,
              previousStatus: target.status,
              reason,
              adminOverride: true,
            },
          });
        }
      }

      for (const id of skippedIds) {
        results.set(id, {
          id,
          ok: false,
          code: 'CONFLICT',
          message: 'Booking status changed before it could be cancelled',
        });
      }
    }

    const ordered = ids
      .map((id) => results.get(id))
      .filter((item): item is AdminBulkCancelItem => item !== undefined);

    const cancelled = ordered.filter((item) => item.ok).length;
    const failed = ordered.filter((item) => !item.ok).length;

    return {
      results: ordered,
      summary: {
        requested: ids.length,
        cancelled,
        failed,
      },
    };
  }

  async confirmBookingsAsAdmin(
    ids: string[],
    actor: TokenPayload
  ): Promise<AdminBulkConfirmResponse> {
    const targets = await this.bookingRepo.findConfirmTargets(ids);
    const targetById = new Map(targets.map((target) => [target.id, target]));

    const results = new Map<string, AdminBulkConfirmItem>();
    const pendingTargets: AdminConfirmTargetRow[] = [];

    for (const id of ids) {
      const target = targetById.get(id);

      if (!target) {
        results.set(id, { id, ok: false, code: 'NOT_FOUND', message: 'Booking not found' });
        continue;
      }

      if (target.status !== BookingStatus.PENDING) {
        results.set(id, {
          id,
          ok: false,
          code: 'CONFLICT',
          message: `Cannot confirm booking with status: ${target.status}`,
        });
        continue;
      }

      pendingTargets.push(target);
    }

    const pendingIds = pendingTargets.map((target) => target.id);
    const paidIds = new Set(
      await this.bookingRepo.findIdsWithLatestPaymentStatusAmong(
        PaymentStatus.COMPLETED,
        pendingIds
      )
    );

    const confirmable: AdminConfirmTargetRow[] = [];

    for (const target of pendingTargets) {
      if (paidIds.has(target.id)) {
        confirmable.push(target);
        continue;
      }

      results.set(target.id, {
        id: target.id,
        ok: false,
        code: 'PAYMENT_NOT_COMPLETED',
        message: 'Booking has no completed payment',
      });
    }

    if (confirmable.length > 0) {
      const { confirmedIds, skippedIds, seatsConfirmedByBookingId } =
        await this.bookingRepo.confirmManyAsAdmin(confirmable);

      if (confirmedIds.length > 0) {
        const auditActor = await this.resolveAuditActor(actor);

        for (const id of confirmedIds) {
          const target = targetById.get(id);
          if (!target) continue;

          const seatsConfirmed = seatsConfirmedByBookingId[id] ?? 0;

          results.set(id, {
            id,
            ok: true,
            status: 'CONFIRMED',
            seatsConfirmed,
            ...(seatsConfirmed === 0 ? { warning: 'SEATS_NOT_CONFIRMED' as const } : {}),
          });

          await writeAuditLog({
            actorId: auditActor.actorId,
            actorName: auditActor.actorName,
            actorRole: auditActor.actorRole,
            action: 'BOOKING_CONFIRMED',
            target: `booking:${target.bookingCode}`,
            targetId: target.id,
            severity: 'INFO',
            metadata: {
              bookingCode: target.bookingCode,
              previousStatus: target.status,
              seatsConfirmed,
              adminOverride: true,
            },
          });
        }
      }

      for (const id of skippedIds) {
        results.set(id, {
          id,
          ok: false,
          code: 'CONFLICT',
          message: 'Booking status changed before it could be confirmed',
        });
      }
    }

    const ordered = ids
      .map((id) => results.get(id))
      .filter((item): item is AdminBulkConfirmItem => item !== undefined);

    const confirmed = ordered.filter((item) => item.ok).length;
    const failed = ordered.filter((item) => !item.ok).length;
    const seatsNotConfirmed = ordered.filter(
      (item) => item.ok && item.seatsConfirmed === 0
    ).length;

    return {
      results: ordered,
      summary: {
        requested: ids.length,
        confirmed,
        failed,
        seatsNotConfirmed,
      },
    };
  }

  async updateBookingNotesAsAdmin(
    bookingId: string,
    actor: TokenPayload,
    notes: string | null
  ): Promise<BookingDetailResponse> {
    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking', bookingId);
    }

    const previousNotesChanged = (booking.notes ?? null) !== notes;
    const updatedBooking = await this.bookingRepo.updateNotes(bookingId, notes);
    const auditActor = await this.resolveAuditActor(actor);

    await writeAuditLog({
      actorId: auditActor.actorId,
      actorName: auditActor.actorName,
      actorRole: auditActor.actorRole,
      action: 'BOOKING_NOTE_UPDATED',
      target: `booking:${booking.bookingCode}`,
      targetId: booking.id,
      severity: 'INFO',
      metadata: {
        bookingCode: booking.bookingCode,
        previousNotesChanged,
      },
    });

    return formatBookingDetailResponse(updatedBooking);
  }

  private isRecordNotFound(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2025'
    );
  }

  private async resolveAuditActor(
    actor: TokenPayload
  ): Promise<{ actorId: string; actorName: string; actorRole: string }> {
    let user: Awaited<ReturnType<BookingRepository['findActorName']>> = null;

    try {
      user = await this.bookingRepo.findActorName(actor.userId);
    } catch (error) {
      logger.error('Failed to resolve audit actor name; falling back to token email', {
        actorId: actor.userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const fullName = [user?.firstName, user?.lastName]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(' ')
      .trim();

    return {
      actorId: actor.userId,
      actorName: fullName || user?.email || actor.email,
      actorRole: actor.role,
    };
  }

  private buildAdminWhere(
    actor: TokenPayload,
    query: AdminBookingQuery
  ): Prisma.BookingWhereInput {
    const where: Prisma.BookingWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (actor.role === 'OPERATOR') {
      where.route = { operatorId: actor.userId };
    } else if (query.operatorId) {
      where.route = { operatorId: query.operatorId };
    }

    if (query.from || query.to) {
      where.departureDate = {
        ...(query.from ? { gte: parseDateStart(query.from) } : {}),
        ...(query.to ? { lte: parseDateEnd(query.to) } : {}),
      };
    }

    if (query.q) {
      const contains = query.q;
      where.OR = [
        { bookingCode: { contains } },
        {
          user: {
            is: {
              OR: [
                { email: { contains } },
                { firstName: { contains } },
                { lastName: { contains } },
              ],
            },
          },
        },
        { contactEmail: { contains } },
      ];
    }

    return where;
  }

  private buildAdminOrderBy(
    sort: AdminBookingQuery['sort']
  ): Prisma.BookingOrderByWithRelationInput {
    const descending = sort.startsWith('-');
    const field = descending ? sort.slice(1) : sort;

    if (field === 'departureDate') {
      return { departureDate: descending ? 'desc' : 'asc' };
    }

    return { createdAt: descending ? 'desc' : 'asc' };
  }

  private startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private buildWindow(days: number): {
    from: Date;
    to: Date;
    dayStarts: { label: string; at: Date }[];
  } {
    const today = this.startOfToday();
    const from = new Date(today);
    from.setDate(from.getDate() - (days - 1));

    const to = new Date(today);
    to.setDate(to.getDate() + 1);

    const dayStarts: { label: string; at: Date }[] = [];
    for (let i = 0; i < days; i += 1) {
      const at = new Date(from);
      at.setDate(from.getDate() + i);
      dayStarts.push({ label: formatLocalDate(at), at });
    }

    return { from, to, dayStarts };
  }

  private localUtcOffsetMinutes(date: Date): number {
    return -date.getTimezoneOffset();
  }
}
