import { prisma, BookingSeat, SeatStatus } from '@vexeviet/database';

export class SeatRepository {
  /**
   * Find seats by route and departure date
   */
  async findByRouteAndDate(
    routeId: string,
    departureDate: Date
  ): Promise<BookingSeat[]> {
    // Normalize date to start of day (UTC) for consistent comparison
    const normalizedDate = new Date(departureDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    
    console.log('[DEBUG] findByRouteAndDate:', { routeId, departureDate, normalizedDate });
    
    const results = await prisma.bookingSeat.findMany({
      where: {
        routeId,
        departureDate: normalizedDate,
      },
    });
    
    console.log('[DEBUG] Found booking seats:', results.length, results.map(r => ({ seatNumber: r.seatNumber, status: r.status })));
    
    return results;
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
            lockedUntil: { gt: new Date() }, // Still held
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
    const lockedUntil = new Date(Date.now() + ttlSeconds * 1000);
    
    // Normalize date to start of day (UTC) for consistent comparison
    const normalizedDate = new Date(departureDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    
    console.log('[DEBUG] holdSeats:', { routeId, departureDate, normalizedDate, seatNumbers, holdId });

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
      
      console.log('[DEBUG] Existing seats in holdSeats:', existingSeats.length);

      // Check for conflicts (already booked or held by another holdId/booking)
      const conflicts = existingSeats.filter(
        seat =>
          seat.status === SeatStatus.BOOKED ||
          (seat.status === SeatStatus.HELD &&
            seat.holdId !== holdId &&
            seat.lockedUntil > new Date())
      );

      if (conflicts.length > 0) {
        throw new Error(
          `Seats unavailable: ${conflicts.map(s => s.seatNumber).join(', ')}`
        );
      }

      // Upsert seats (create if not exists, update if exists)
      const results: BookingSeat[] = [];
      for (const seatNumber of seatNumbers) {
        const existingSeat = existingSeats.find(s => s.seatNumber === seatNumber);

        if (existingSeat) {
          // Update existing seat
          const updated = await tx.bookingSeat.update({
            where: { id: existingSeat.id },
            data: {
              holdId,
              bookingId: null, // Clear bookingId when re-holding
              status: SeatStatus.HELD,
              lockedAt: new Date(),
              lockedUntil,
            },
          });
          results.push(updated);
        } else {
          // Create new seat record with normalized date
          const created = await tx.bookingSeat.create({
            data: {
              holdId,
              routeId,
              departureDate: normalizedDate,
              seatNumber,
              status: SeatStatus.HELD,
              lockedAt: new Date(),
              lockedUntil,
            },
          });
          console.log('[DEBUG] Created new booking seat:', created);
          results.push(created);
        }
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
