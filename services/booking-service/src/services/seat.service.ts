import { SeatRepository } from '../repositories/seat.repository';
import { prisma, SeatStatus, RouteStatus } from '@vexeviet/database';
import {
  SeatAvailabilityRequest,
  SeatAvailabilityResponse,
  SeatHoldRequest,
  SeatHoldResponse,
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

    // Get route info
    const route = await prisma.route.findFirst({
      where: {
        id: routeId,
        status: RouteStatus.ACTIVE,
      },
      select: {
        id: true,
        totalSeats: true,
      },
    });

    if (!route) {
      throw new NotFoundError('Route', routeId);
    }

    // Get all seat records for this route/date
    const seatRecords = await this.seatRepo.findByRouteAndDate(routeId, date);

    // Get availability summary
    const summary = await this.seatRepo.getAvailabilitySummary(
      routeId,
      date,
      route.totalSeats
    );

    // Generate all seat info
    const seatMap = new Map(seatRecords.map(s => [s.seatNumber, s]));
    const seats: SeatAvailabilityResponse['seats'] = [];

    // Generate seat numbers (assuming standard bus layout)
    for (let i = 1; i <= route.totalSeats; i++) {
      const row = Math.ceil(i / 4);
      const col = ((i - 1) % 4) + 1;
      const seatNumber = `${String.fromCharCode(64 + col)}${row}`; // A1, B1, C1, D1, A2, B2...

      const seatRecord = seatMap.get(seatNumber);

      if (!seatRecord) {
        seats.push({
          seatNumber,
          status: SeatStatus.AVAILABLE,
        });
      } else {
        const isHeldAndValid =
          seatRecord.status === SeatStatus.HELD &&
          seatRecord.lockedUntil > new Date();

        seats.push({
          seatNumber,
          status: isHeldAndValid ? SeatStatus.HELD : seatRecord.status,
          lockedUntil: isHeldAndValid
            ? seatRecord.lockedUntil.toISOString()
            : undefined,
        });
      }
    }

    return {
      routeId,
      departureDate,
      totalSeats: route.totalSeats,
      availableSeats: summary.availableSeats,
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
        status: RouteStatus.ACTIVE,
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
      select: { totalSeats: true },
    });

    if (!route) {
      throw new NotFoundError('Route', routeId);
    }

    // Generate valid seat numbers
    const validSeatNumbers = new Set<string>();
    for (let i = 1; i <= route.totalSeats; i++) {
      const row = Math.ceil(i / 4);
      const col = ((i - 1) % 4) + 1;
      const seatNumber = `${String.fromCharCode(64 + col)}${row}`;
      validSeatNumbers.add(seatNumber);
    }

    const invalidSeats = seats.filter(s => !validSeatNumbers.has(s));

    return {
      valid: invalidSeats.length === 0,
      invalidSeats,
    };
  }
}
