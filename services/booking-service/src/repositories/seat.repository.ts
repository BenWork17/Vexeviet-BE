import { prisma, BookingSeat, SeatStatus } from '@vexeviet/database';
import type { AdminSeatBlockResult, AdminSeatUnblockResult } from '../types';
import { SeatAdminRepository } from './seat-admin.repository';

export class SeatRepository {
  private readonly adminRepo: SeatAdminRepository;

  constructor(adminRepo: SeatAdminRepository = new SeatAdminRepository()) {
    this.adminRepo = adminRepo;
  }

  /**
   * Find seats by route and departure date
   */
  async findByRouteAndDate(
    routeId: string,
    departureDate: Date
  ): Promise<BookingSeat[]> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(routeId)) {
      return [];
    }

    const normalizedDate = new Date(departureDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    return prisma.bookingSeat.findMany({
      where: {
        routeId,
        departureDate: normalizedDate,
      },
    });
  }

  /**
   * Find specific seats by route, date, and seat numbers
   */
  async findSeats(
    routeId: string,
    departureDate: Date,
    seatNumbers: string[]
  ): Promise<BookingSeat[]> {
    return prisma.bookingSeat.findMany({
      where: {
        routeId,
        departureDate,
        seatNumber: { in: seatNumbers },
      },
    });
  }

  /**
   * Check if seats are available (not held, booked, or maintenance-blocked).
   * `BLOCKED` is unconditional — not gated on `lockedUntil`.
   */
  async checkAvailability(
    routeId: string,
    departureDate: Date,
    seatNumbers: string[]
  ): Promise<{ available: boolean; unavailableSeats: string[] }> {
    const normalizedDate = new Date(departureDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const existingSeats = await prisma.bookingSeat.findMany({
      where: {
        routeId,
        departureDate: normalizedDate,
        seatNumber: { in: seatNumbers },
        OR: [
          { status: SeatStatus.BOOKED },
          { status: SeatStatus.BLOCKED },
          {
            status: SeatStatus.HELD,
            lockedUntil: { gt: new Date() },
          },
        ],
      },
      select: {
        seatNumber: true,
        status: true,
      },
    });

    const unavailableSeats = existingSeats.map(s => s.seatNumber);
    return {
      available: unavailableSeats.length === 0,
      unavailableSeats,
    };
  }

  /**
   * Hold seats with guarded transactional writes so concurrent maintenance
   * blocks (`BLOCKED`) or rival holds cannot be silently overwritten.
   */
  async holdSeats(
    routeId: string,
    departureDate: Date,
    seatNumbers: string[],
    holdId: string,
    ttlSeconds: number = 900
  ): Promise<BookingSeat[]> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(routeId)) {
      throw new Error(`Invalid Route ID format: ${routeId}`);
    }

    const lockedUntil = new Date(Date.now() + ttlSeconds * 1000);
    const normalizedDate = new Date(departureDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    return prisma.$transaction(async tx => {
      const existingSeats = await tx.bookingSeat.findMany({
        where: {
          routeId,
          departureDate: normalizedDate,
          seatNumber: { in: seatNumbers },
        },
      });

      const conflicts = existingSeats.filter(
        seat =>
          seat.status === SeatStatus.BOOKED ||
          seat.status === SeatStatus.BLOCKED ||
          (seat.status === SeatStatus.HELD &&
            seat.holdId !== holdId &&
            seat.lockedUntil > new Date())
      );

      if (conflicts.length > 0) {
        throw this.seatsUnavailableError(conflicts.map(s => s.seatNumber));
      }

      const results: BookingSeat[] = [];
      const existingBySeatNumber = new Map(existingSeats.map(seat => [seat.seatNumber, seat]));

      for (const seatNumber of seatNumbers) {
        const existing = existingBySeatNumber.get(seatNumber);
        const holdData = {
          holdId,
          bookingId: null,
          status: SeatStatus.HELD,
          lockedAt: new Date(),
          lockedUntil,
        };

        if (!existing) {
          results.push(
            await tx.bookingSeat.create({
              data: {
                ...holdData,
                routeId,
                departureDate: normalizedDate,
                seatNumber,
              },
            })
          );
          continue;
        }

        const updated = await tx.bookingSeat.updateMany({
          where: {
            id: existing.id,
            status: { not: SeatStatus.BLOCKED },
          },
          data: holdData,
        });

        if (updated.count === 0) {
          throw this.seatsUnavailableError([seatNumber]);
        }

        results.push(await tx.bookingSeat.findUniqueOrThrow({ where: { id: existing.id } }));
      }

      return results;
    });
  }

  /**
   * Confirm seats (change status from HELD to BOOKED) and link to booking
   */
  async confirmSeats(holdId: string, bookingId: string): Promise<number> {
    const result = await prisma.bookingSeat.updateMany({
      where: {
        holdId,
        status: SeatStatus.HELD,
      },
      data: {
        bookingId,
        status: SeatStatus.BOOKED,
      },
    });
    return result.count;
  }

  /**
   * Confirm seats by booking ID (used when confirming payment)
   */
  async confirmSeatsByBookingId(bookingId: string): Promise<number> {
    const result = await prisma.bookingSeat.updateMany({
      where: {
        bookingId,
        status: SeatStatus.HELD,
      },
      data: {
        status: SeatStatus.BOOKED,
      },
    });
    return result.count;
  }

  /**
   * Release seats by holdId (for held seats not yet booked)
   */
  async releaseSeats(holdId: string): Promise<number> {
    const result = await prisma.bookingSeat.deleteMany({
      where: {
        holdId,
        status: SeatStatus.HELD,
      },
    });
    return result.count;
  }

  /**
   * Release seats by bookingId (when cancelling booking)
   */
  async releaseSeatsByBookingId(bookingId: string): Promise<number> {
    const result = await prisma.bookingSeat.deleteMany({
      where: {
        bookingId,
        status: { in: [SeatStatus.HELD, SeatStatus.BOOKED] },
      },
    });
    return result.count;
  }

  /**
   * Release expired held seats (cleanup job)
   */
  async releaseExpiredHolds(): Promise<number> {
    const result = await prisma.bookingSeat.deleteMany({
      where: {
        status: SeatStatus.HELD,
        lockedUntil: { lt: new Date() },
      },
    });
    return result.count;
  }

  /**
   * Get seat availability summary for a route/date
   */
  async getAvailabilitySummary(
    routeId: string,
    departureDate: Date,
    totalSeats: number
  ): Promise<{
    totalSeats: number;
    bookedSeats: number;
    heldSeats: number;
    availableSeats: number;
  }> {
    const seats = await prisma.bookingSeat.groupBy({
      by: ['status'],
      where: {
        routeId,
        departureDate,
        OR: [
          { status: SeatStatus.BOOKED },
          {
            status: SeatStatus.HELD,
            lockedUntil: { gt: new Date() },
          },
        ],
      },
      _count: {
        status: true,
      },
    });

    const bookedSeats =
      seats.find(s => s.status === SeatStatus.BOOKED)?._count.status || 0;
    const heldSeats =
      seats.find(s => s.status === SeatStatus.HELD)?._count.status || 0;

    return {
      totalSeats,
      bookedSeats,
      heldSeats,
      availableSeats: totalSeats - bookedSeats - heldSeats,
    };
  }

  /**
   * Delegate admin/operator maintenance seat blocking to SeatAdminRepository
   */
  async blockSeats(
    routeId: string,
    departureDate: Date,
    seatNumbers: string[],
    validSeatNumbers: ReadonlySet<string>
  ): Promise<AdminSeatBlockResult> {
    return this.adminRepo.blockSeats(routeId, departureDate, seatNumbers, validSeatNumbers);
  }

  /**
   * Delegate admin/operator maintenance seat unblocking to SeatAdminRepository
   */
  async unblockSeats(
    routeId: string,
    departureDate: Date,
    seatNumbers: string[]
  ): Promise<AdminSeatUnblockResult> {
    return this.adminRepo.unblockSeats(routeId, departureDate, seatNumbers);
  }

  private seatsUnavailableError(unavailableSeats: string[]): Error & {
    statusCode: number;
    code: string;
    details: { unavailableSeats: string[] };
  } {
    const error = new Error(`Seats unavailable: ${unavailableSeats.join(', ')}`) as Error & {
      statusCode: number;
      code: string;
      details: { unavailableSeats: string[] };
    };
    error.statusCode = 409;
    error.code = 'SEATS_UNAVAILABLE';
    error.details = { unavailableSeats };
    return error;
  }
}
