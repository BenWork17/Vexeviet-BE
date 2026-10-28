import { SeatRepository } from '../repositories/seat.repository';
import { prisma, SeatStatus, writeAuditLog } from '@vexeviet/database';
import {
  SeatAvailabilityRequest,
  SeatAvailabilityResponse,
  SeatHoldRequest,
  SeatHoldResponse,
  TokenPayload,
  AdminSeatBlockRequest,
  AdminSeatBlockResult,
  AdminSeatUnblockRequest,
  AdminSeatUnblockResult,
} from '../types';
import { NotFoundError, SeatsUnavailableError } from '../middlewares/error.middleware';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

export class SeatService {
  private seatRepo: SeatRepository;

  constructor() {
    this.seatRepo = new SeatRepository();
  }

  /**
   * Get seat availability for a route/date
   */
  async getAvailability(
    request: SeatAvailabilityRequest
  ): Promise<SeatAvailabilityResponse> {
    const { routeId, departureDate } = request;
    const date = new Date(departureDate);

    // Get route with busTemplate and seats
    const route = await prisma.route.findFirst({
      where: {
        id: routeId,
        // status: RouteStatus.ACTIVE, // Temporarily disable strict status check for testing
      },
      include: {
        busTemplate: {
          include: {
            seats: {
              where: { isAvailable: true },
              orderBy: [
                { floor: 'asc' },
                { rowNumber: 'asc' },
                { columnPosition: 'asc' },
              ],
            }
          }
        }
      },
    });

    if (!route) {
      throw new NotFoundError('Route', routeId);
    }

    if (!route.busTemplate) {
      throw this.seatTemplateRequiredError(routeId);
    }

    const templateSeats = route.busTemplate.seats;

    // Get all booking seat records for this route/date
    const seatRecords = await this.seatRepo.findByRouteAndDate(routeId, date);

    // Generate seat info from template
    const seatMap = new Map(seatRecords.map(s => [s.seatNumber, s]));
    const seats: SeatAvailabilityResponse['seats'] = [];

    // Map real seats from template with their booking status
    for (const tSeat of templateSeats) {
      const bookingRecord = seatMap.get(tSeat.seatNumber);
      
      // Explicit `SeatStatus` type: without it `status` is inferred as the
      // literal 'AVAILABLE' and the reassignments below fail to type-check.
      const seatInfo: SeatAvailabilityResponse['seats'][number] = {
        id: tSeat.id,
        seatNumber: tSeat.seatNumber,
        seatLabel: tSeat.seatLabel || tSeat.seatNumber,
        row: tSeat.rowNumber,
        column: tSeat.columnPosition,
        floor: tSeat.floor,
        seatType: tSeat.seatType,
        position: tSeat.position,
        basePrice: Number(route.price),
        priceModifier: Number(tSeat.priceModifier),
        finalPrice: Number(route.price) + Number(tSeat.priceModifier),
        status: SeatStatus.AVAILABLE,
        isSelectable: true,
        metadata: tSeat.metadata,
      };

      if (!tSeat.isAvailable) {
        // Template-level: this seat does not exist / is broken for this vehicle.
        seatInfo.status = SeatStatus.BLOCKED;
        seatInfo.isSelectable = false;
      } else if (bookingRecord?.status === SeatStatus.BLOCKED) {
        // Per-date admin maintenance block. Checked before the HELD/BOOKED
        // branch because it is an unconditional unavailability: a BLOCKED row
        // carries `lockedUntil` = end of service date, which is intentionally
        // not read as a hold deadline.
        seatInfo.status = SeatStatus.BLOCKED;
        seatInfo.isSelectable = false;
      } else if (bookingRecord) {
        const isHeldAndValid =
          bookingRecord.status === SeatStatus.HELD &&
          bookingRecord.lockedUntil > new Date();

        if (bookingRecord.status === SeatStatus.BOOKED || isHeldAndValid) {
          seatInfo.status = bookingRecord.status === SeatStatus.BOOKED ? SeatStatus.BOOKED : SeatStatus.HELD;
          seatInfo.isSelectable = false;
        }
      }

      seats.push(seatInfo);
    }
    
    const realAvailableCount = seats.filter(s => s.status === SeatStatus.AVAILABLE).length;

    return {
      routeId,
      departureDate,
      totalSeats: route.busTemplate.totalSeats, // Lấy từ BusTemplate
      availableSeats: realAvailableCount,
      seats,
    };
  }

  /**
   * Check if specific seats are available
   */
  async checkSeatsAvailable(
    routeId: string,
    departureDate: string,
    seats: string[]
  ): Promise<{ available: boolean; unavailableSeats: string[] }> {
    const date = new Date(departureDate);
    return this.seatRepo.checkAvailability(routeId, date, seats);
  }

  /**
   * Temporarily hold seats (before booking)
   */
  async holdSeats(request: SeatHoldRequest): Promise<SeatHoldResponse> {
    const { routeId, departureDate, seats, ttlSeconds } = request;
    const date = new Date(departureDate);
    const ttl = ttlSeconds || config.booking.seatHoldTTL;

    // Verify route exists
    const route = await prisma.route.findFirst({
      where: {
        id: routeId,
        // status: RouteStatus.ACTIVE,
      },
    });

    if (!route) {
      throw new NotFoundError('Route', routeId);
    }

    // Check availability
    const availability = await this.seatRepo.checkAvailability(routeId, date, seats);
    if (!availability.available) {
      throw new SeatsUnavailableError(availability.unavailableSeats);
    }

    // Generate hold ID
    const holdId = uuidv4();

    // Hold seats
    const heldSeats = await this.seatRepo.holdSeats(
      routeId,
      date,
      seats,
      holdId, // Using holdId as temporary booking reference
      ttl
    );

    const expiresAt = new Date(Date.now() + ttl * 1000);

    return {
      success: true,
      holdId,
      seats: heldSeats.map(s => s.seatNumber),
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Release held seats
   */
  async releaseHeldSeats(holdId: string): Promise<void> {
    await this.seatRepo.releaseSeats(holdId);
  }

  /**
   * Cleanup expired seat holds (scheduled job)
   */
  async cleanupExpiredHolds(): Promise<number> {
    return this.seatRepo.releaseExpiredHolds();
  }

  /**
   * Get seats held by a specific booking
   */
  async getSeatsForBooking(bookingId: string): Promise<string[]> {
    const seats = await prisma.bookingSeat.findMany({
      where: { bookingId },
      select: { seatNumber: true },
    });
    return seats.map(s => s.seatNumber);
  }

  /**
   * Validate seat numbers for a route
   */
  async validateSeatNumbers(
    routeId: string,
    seats: string[]
  ): Promise<{ valid: boolean; invalidSeats: string[] }> {
    const route = await prisma.route.findFirst({
      where: { id: routeId },
      include: {
        busTemplate: {
          include: {
            seats: {
              where: { isAvailable: true }
            }
          }
        }
      },
    });

    if (!route) {
      throw new NotFoundError('Route', routeId);
    }

    if (!route.busTemplate) {
      throw this.seatTemplateRequiredError(routeId);
    }

    // Get valid seat numbers from the template
    const validSeatNumbers = new Set(route.busTemplate.seats.map(s => s.seatNumber));
    const invalidSeats = seats.filter(s => !validSeatNumbers.has(s));

    return {
      valid: invalidSeats.length === 0,
      invalidSeats,
    };
  }

  // =====================================================
  // ADMIN MAINTENANCE SEAT BLOCKING (`Khóa ghế bảo trì`)
  // =====================================================

  /**
   * Block seats for one route/date (admin maintenance).
   *
   * `404` when the route does not exist or has no bus template — the whole
   * request is meaningless then. An individual seat that is not in the template
   * is a per-item `skipped` entry instead, so one typo cannot block the other
   * seats.
   */
  async blockSeats(
    request: AdminSeatBlockRequest,
    actor: TokenPayload
  ): Promise<AdminSeatBlockResult> {
    const { routeId, departureDate, seatNumbers, reason } = request;

    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        busTemplate: {
          select: {
            seats: { select: { seatNumber: true } },
          },
        },
      },
    });

    if (!route) {
      throw new NotFoundError('Route', routeId);
    }

    if (!route.busTemplate) {
      throw this.seatTemplateRequiredError(routeId);
    }

    const validSeatNumbers = new Set(route.busTemplate.seats.map(seat => seat.seatNumber));
    const date = this.parseDepartureDate(departureDate);

    const result = await this.seatRepo.blockSeats(routeId, date, seatNumbers, validSeatNumbers);

    // One audit row for the whole request: a 40-seat block is one admin action,
    // and one row per seat would bury the rest of the trail under a single
    // click. `writeAuditLog` never throws, so it cannot fail this request.
    const auditActor = await this.resolveAuditActor(actor);

    await writeAuditLog({
      actorId: auditActor.actorId,
      actorName: auditActor.actorName,
      actorRole: auditActor.actorRole,
      action: 'SEAT_BLOCKED',
      target: `route:${routeId}`,
      targetId: routeId,
      severity: 'WARNING',
      metadata: {
        routeId,
        departureDate,
        seatNumbers: result.blocked,
        reason,
        skippedSeatNumbers: result.skipped.map(item => item.seatNumber),
      },
    });

    return result;
  }

  /**
   * Remove a maintenance block from seats for one route/date.
   *
   * Only `BLOCKED` rows are touched; a held or sold seat is reported skipped and
   * never released by an unblock. Idempotent per seat: a seat with no block is
   * `skipped` with `NOT_BLOCKED`, not a request-level error.
   */
  async unblockSeats(
    request: AdminSeatUnblockRequest,
    actor: TokenPayload
  ): Promise<AdminSeatUnblockResult> {
    const { routeId, departureDate, seatNumbers } = request;

    const route = await prisma.route.findUnique({
      where: { id: routeId },
      select: { id: true, busTemplateId: true },
    });

    if (!route) {
      throw new NotFoundError('Route', routeId);
    }

    if (!route.busTemplateId) {
      throw this.seatTemplateRequiredError(routeId);
    }

    const date = this.parseDepartureDate(departureDate);
    const result = await this.seatRepo.unblockSeats(routeId, date, seatNumbers);

    const auditActor = await this.resolveAuditActor(actor);

    await writeAuditLog({
      actorId: auditActor.actorId,
      actorName: auditActor.actorName,
      actorRole: auditActor.actorRole,
      action: 'SEAT_UNBLOCKED',
      target: `route:${routeId}`,
      targetId: routeId,
      severity: 'INFO',
      metadata: {
        routeId,
        departureDate,
        seatNumbers: result.unblocked,
        skippedSeatNumbers: result.skipped.map(item => item.seatNumber),
      },
    });

    return result;
  }

  /**
   * A route with no seat template cannot produce or validate a seat map.
   *
   * This is a state of the data, not a server fault: a bare `Error` here used
   * to surface as `500` through `errorHandler`, which pages an operator for
   * something no retry fixes. `NotFoundError` maps to `404` and the message
   * tells the caller what to do about it. Shared by every site that needs
   * `busTemplate`, so the four answers cannot drift apart again.
   */
  private seatTemplateRequiredError(routeId: string): NotFoundError {
    return new NotFoundError(
      'Bus template for route',
      routeId,
      `Route '${routeId}' has no seat template. A seat template must be assigned to this route before seats can be shown, validated, blocked or unblocked.`
    );
  }

  /**
   * Parse a validated `YYYY-MM-DD` into the UTC midnight the `@db.Date` column
   * and every repository normalisation expect.
   */
  private parseDepartureDate(departureDate: string): Date {
    return new Date(`${departureDate}T00:00:00.000Z`);
  }

  /**
   * Audit actor snapshot for an admin action — the same fallback chain P7 uses
   * (full name → account email → token email), because `writeAuditLog` emits a
   * row whose `actorName` must never be empty.
   *
   * Best-effort: it runs after the business write, so a lookup failure falls
   * back to the token email rather than turning a successful block into a 500.
   */
  private async resolveAuditActor(
    actor: TokenPayload
  ): Promise<{ actorId: string; actorName: string; actorRole: string }> {
    let user: { firstName: string | null; lastName: string | null; email: string } | null = null;

    try {
      user = await prisma.user.findUnique({
        where: { id: actor.userId },
        select: { firstName: true, lastName: true, email: true },
      });
    } catch (error) {
      console.error('[audit] failed to resolve actor name; falling back to token email', {
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
}
