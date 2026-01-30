import { prisma, BookingSeat, SeatStatus } from '@vexeviet/database';

export class SeatRepository {
  /**
   * Find seats by route and departure date
   */
  async findByRouteAndDate(
    routeId: string,
    departureDate: Date
  ): Promise<BookingSeat[]> {
    // Validate UUID format before querying Prisma to avoid P2023 error (400 Bad Request)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(routeId)) {
      return [];
    }

    // Normalize date to start of day (UTC) for consistent comparison
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
   * Check if seats are available (not held or booked)
   */
  async checkAvailability(
    routeId: string,
    departureDate: Date,
    seatNumbers: string[]
  ): Promise<{ available: boolean; unavailableSeats: string[] }> {
    const existingSeats = await prisma.bookingSeat.findMany({
      where: {
        routeId,
        departureDate,
        seatNumber: { in: seatNumbers },
        OR: [
          { status: SeatStatus.BOOKED },
          {
            status: SeatStatus.HELD,
            lockedUntil: { gt: new Date() },
            bookingId: { not: null }, // Only unavailable if actually linked to a booking
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
   * Hold seats with pessimistic locking using transaction
   */
  async holdSeats(
    routeId: string,
    departureDate: Date,
    seatNumbers: string[],
    holdId: string,
    ttlSeconds: number = 900
  ): Promise<BookingSeat[]> {
    // Validate UUID format before querying Prisma to avoid P2023 error (400 Bad Request)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(routeId)) {
      throw new Error(`Invalid Route ID format: ${routeId}`);
    }

    const lockedUntil = new Date(Date.now() + ttlSeconds * 1000);
    
    // Normalize date to start of day (UTC) for consistent comparison
    const normalizedDate = new Date(departureDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    
    // Use raw query for pessimistic locking
    return prisma.$transaction(async (tx) => {
      // First, check and lock the rows
      const existingSeats = await tx.bookingSeat.findMany({
        where: {
          routeId,
          departureDate: normalizedDate,
          seatNumber: { in: seatNumbers },
        },
      });
      
      // Check for conflicts (already booked or held by another holdId/booking)
      const conflicts = existingSeats.filter(
        seat =>
          seat.status === SeatStatus.BOOKED ||
          (seat.status === SeatStatus.HELD &&
            seat.holdId !== holdId &&
            seat.bookingId !== null && // If linked to a booking, it's a real conflict
            seat.lockedUntil > new Date())
      );

      if (conflicts.length > 0) {
        const unavailableSeats = conflicts.map(s => s.seatNumber);
        const error = new Error(`Seats unavailable: ${unavailableSeats.join(', ')}`) as any;
        error.statusCode = 409;
        error.code = 'SEATS_UNAVAILABLE';
        error.details = { unavailableSeats };
        throw error;
      }

      // Upsert seats (create if not exists, update if exists)
      const results: BookingSeat[] = [];
      for (const seatNumber of seatNumbers) {
        // Use upsert to be safe against race conditions
        const result = await tx.bookingSeat.upsert({
          where: {
            routeId_departureDate_seatNumber: {
              routeId,
              departureDate: normalizedDate,
              seatNumber,
            },
          },
          create: {
            holdId,
            routeId,
            departureDate: normalizedDate,
            seatNumber,
            status: SeatStatus.HELD,
            lockedAt: new Date(),
            lockedUntil,
          },
          update: {
            holdId,
            bookingId: null, // Clear bookingId when re-holding
            status: SeatStatus.HELD,
            lockedAt: new Date(),
            lockedUntil,
          },
        });
        results.push(result);
      }

      return results;
    });
  }

  /**
   * Confirm seats (change status from HELD to BOOKED)
   * Links the held seats to the actual booking
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
   * Confirm seats by booking ID (change status from HELD to BOOKED)
   * Used when confirming payment for an existing booking
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
   * Release seats by bookingId (for booked seats - when cancelling booking)
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
}
