import { prisma } from '@vexeviet/database';
import { Seat, BusTemplate, BookingSeat, SeatStatus } from '@prisma/client';

export interface SeatWithTemplate extends Seat {
  busTemplate: BusTemplate;
}

export interface BookedSeatInfo {
  seatId: string;
  seatNumber: string;
  status: SeatStatus;
}

export class SeatRepository {
  /**
   * Find all seats for a bus template
   */
  async findByBusTemplateId(busTemplateId: string): Promise<Seat[]> {
    return prisma.seat.findMany({
      where: { 
        busTemplateId,
        isAvailable: true,
      },
      orderBy: [
        { floor: 'asc' },
        { rowNumber: 'asc' },
        { columnPosition: 'asc' },
      ],
    });
  }

  /**
   * Find a single seat by ID
   */
  async findById(id: string): Promise<Seat | null> {
    return prisma.seat.findUnique({
      where: { id },
    });
  }

  /**
   * Find seat by template and seat number
   */
  async findByTemplateAndNumber(busTemplateId: string, seatNumber: string): Promise<Seat | null> {
    return prisma.seat.findFirst({
      where: {
        busTemplateId,
        seatNumber,
      },
    });
  }

  /**
   * Get booked/held seats for a route on a specific date
   */
  async getBookedSeats(routeId: string, departureDate: Date): Promise<BookedSeatInfo[]> {
    const bookedSeats = await prisma.bookingSeat.findMany({
      where: {
        routeId,
        departureDate,
        OR: [
          // Include all BOOKED and BLOCKED
          { status: { in: ['BOOKED', 'BLOCKED'] } },
          // Include HELD only if not expired
          { 
            status: 'HELD',
            lockedUntil: { gt: new Date() },
          },
        ],
      },
      select: {
        seatId: true,
        seatNumber: true,
        status: true,
      },
    });

    return bookedSeats.map(seat => ({
      seatId: seat.seatId || '',
      seatNumber: seat.seatNumber,
      status: seat.status,
    }));
  }

  /**
   * Create a booking seat record (hold a seat)
   */
  async holdSeat(data: {
    bookingId: string;
    routeId: string;
    seatId: string;
    departureDate: Date;
    seatNumber: string;
    price: number;
    lockedUntil: Date;
  }): Promise<BookingSeat> {
    return prisma.bookingSeat.create({
      data: {
        bookingId: data.bookingId,
        routeId: data.routeId,
        seatId: data.seatId,
        departureDate: data.departureDate,
        seatNumber: data.seatNumber,
        status: 'HELD',
        lockedUntil: data.lockedUntil,
        price: data.price,
      },
    });
  }

  /**
   * Update seat status (HELD -> BOOKED, etc.)
   */
  async updateSeatStatus(
    routeId: string,
    departureDate: Date,
    seatNumber: string,
    status: SeatStatus
  ): Promise<BookingSeat> {
    return prisma.bookingSeat.update({
      where: {
        routeId_departureDate_seatNumber: {
          routeId,
          departureDate,
          seatNumber,
        },
      },
      data: { status },
    });
  }

  /**
   * Release expired holds
   */
  async releaseExpiredHolds(): Promise<number> {
    const result = await prisma.bookingSeat.deleteMany({
      where: {
        status: 'HELD',
        lockedUntil: { lt: new Date() },
      },
    });
    return result.count;
  }

  /**
   * Check if a seat is available for booking
   */
  async isSeatAvailable(
    routeId: string,
    departureDate: Date,
    seatNumber: string
  ): Promise<boolean> {
    const existing = await prisma.bookingSeat.findFirst({
      where: {
        routeId,
        departureDate,
        seatNumber,
        OR: [
          { status: { in: ['BOOKED', 'BLOCKED'] } },
          { 
            status: 'HELD',
            lockedUntil: { gt: new Date() },
          },
        ],
      },
    });
    return !existing;
  }
}

export const seatRepository = new SeatRepository();
