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
      throw new Error('Bus template not found for this route');
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
      
      const seatInfo = {
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
        status: SeatStatus.AVAILABLE as any,
        isSelectable: true,
        metadata: tSeat.metadata,
      };

      if (!tSeat.isAvailable) {
        seatInfo.status = 'BLOCKED';
        seatInfo.isSelectable = false;
      } else if (bookingRecord) {
        const isHeldAndValid =
          bookingRecord.status === SeatStatus.HELD &&
          bookingRecord.lockedUntil > new Date();

        seatInfo.status = isHeldAndValid ? SeatStatus.HELD : bookingRecord.status;
        seatInfo.isSelectable = false;
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
      throw new Error('Bus template not found for this route');
    }

    // Get valid seat numbers from the template
    const validSeatNumbers = new Set(route.busTemplate.seats.map(s => s.seatNumber));
    const invalidSeats = seats.filter(s => !validSeatNumbers.has(s));

    return {
      valid: invalidSeats.length === 0,
      invalidSeats,
    };
  }
}
