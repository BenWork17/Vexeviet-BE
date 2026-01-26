import { prisma } from '@vexeviet/database';
import { seatRepository, BookedSeatInfo } from '../repositories/seat.repository';
import type { Seat, BusTemplate } from '@prisma/client';

// =====================================================
// TYPES
// =====================================================

export interface BusTemplateInfo {
  id: string;
  name: string;
  busType: string;
  totalSeats: number;
  floors: number;
  rowsPerFloor: number;
  columns: string[];
  layoutImage: string | null;
}

export interface SeatInfo {
  id: string;
  seatNumber: string;
  seatLabel: string;
  row: number;
  column: string;
  floor: number;
  seatType: string;
  position: string;
  basePrice: number;
  priceModifier: number;
  finalPrice: number;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED';
  isSelectable: boolean;
  metadata: Record<string, unknown> | null;
}

export interface SeatAvailabilitySummary {
  totalSeats: number;
  availableSeats: number;
  bookedSeats: number;
  heldSeats: number;
  blockedSeats: number;
}

export interface SeatAvailabilityResponse {
  routeId: string;
  departureDate: string;
  busTemplate: BusTemplateInfo;
  seats: SeatInfo[];
  summary: SeatAvailabilitySummary;
}

// =====================================================
// SERVICE
// =====================================================

export class SeatService {
  /**
   * Get seat availability for a route on a specific date
   */
  async getSeatAvailability(
    routeId: string,
    departureDate: string
  ): Promise<SeatAvailabilityResponse> {
    // 1. Get route with bus template
    const route = await prisma.route.findUnique({
      where: { id: routeId },
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
            },
          },
        },
      },
    });

    if (!route) {
      throw new Error('ROUTE_NOT_FOUND');
    }

    if (!route.busTemplate) {
      throw new Error('BUS_TEMPLATE_NOT_FOUND');
    }

    const busTemplate = route.busTemplate;
    const templateSeats = busTemplate.seats;

    // 2. Get booked/held seats for this date
    const bookedSeats = await seatRepository.getBookedSeats(
      routeId,
      new Date(departureDate)
    );

    // Create a map for quick lookup
    const bookedSeatMap = new Map<string, BookedSeatInfo>();
    for (const seat of bookedSeats) {
      bookedSeatMap.set(seat.seatNumber, seat);
    }

    // 3. Map seats with availability status
    const seats: SeatInfo[] = templateSeats.map((seat) => {
      const bookedInfo = bookedSeatMap.get(seat.seatNumber);
      const status = bookedInfo?.status || 'AVAILABLE';

      return {
        id: seat.id,
        seatNumber: seat.seatNumber,
        seatLabel: seat.seatLabel || seat.seatNumber,
        row: seat.rowNumber,
        column: seat.columnPosition,
        floor: seat.floor,
        seatType: seat.seatType,
        position: seat.position,
        basePrice: Number(route.price),
        priceModifier: Number(seat.priceModifier),
        finalPrice: Number(route.price) + Number(seat.priceModifier),
        status: status as SeatInfo['status'],
        isSelectable: status === 'AVAILABLE',
        metadata: seat.metadata as Record<string, unknown> | null,
      };
    });

    // 4. Calculate summary
    const summary: SeatAvailabilitySummary = {
      totalSeats: busTemplate.totalSeats, // Dùng tổng ghế danh định từ Template
      availableSeats: seats.filter((s) => s.status === 'AVAILABLE').length,
      bookedSeats: seats.filter((s) => s.status === 'BOOKED').length,
      heldSeats: seats.filter((s) => s.status === 'HELD').length,
      blockedSeats: seats.filter((s) => s.status === 'BLOCKED').length,
    };

    // 5. Build response
    return {
      routeId,
      departureDate,
      busTemplate: {
        id: busTemplate.id,
        name: busTemplate.name,
        busType: busTemplate.busType,
        totalSeats: busTemplate.totalSeats,
        floors: busTemplate.floors,
        rowsPerFloor: busTemplate.rowsPerFloor,
        columns: busTemplate.columns.split(','),
        layoutImage: busTemplate.layoutImage,
      },
      seats,
      summary,
    };
  }

  /**
   * Check if specific seats are available
   */
  async checkSeatsAvailable(
    routeId: string,
    departureDate: string,
    seatNumbers: string[]
  ): Promise<{ available: boolean; unavailableSeats: string[] }> {
    const unavailableSeats: string[] = [];

    for (const seatNumber of seatNumbers) {
      const isAvailable = await seatRepository.isSeatAvailable(
        routeId,
        new Date(departureDate),
        seatNumber
      );
      if (!isAvailable) {
        unavailableSeats.push(seatNumber);
      }
    }

    return {
      available: unavailableSeats.length === 0,
      unavailableSeats,
    };
  }

  /**
   * Hold seats for a booking (15-minute lock)
   */
  async holdSeats(
    bookingId: string,
    routeId: string,
    departureDate: string,
    seatIds: string[],
    basePrice: number
  ): Promise<void> {
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    for (const seatId of seatIds) {
      const seat = await prisma.seat.findUnique({ where: { id: seatId } });
      if (!seat) {
        throw new Error(`SEAT_NOT_FOUND: ${seatId}`);
      }

      const finalPrice = basePrice + Number(seat.priceModifier);

      await seatRepository.holdSeat({
        bookingId,
        routeId,
        seatId,
        departureDate: new Date(departureDate),
        seatNumber: seat.seatNumber,
        price: finalPrice,
        lockedUntil,
      });
    }
  }

  /**
   * Confirm seats (change status from HELD to BOOKED)
   */
  async confirmSeats(
    routeId: string,
    departureDate: string,
    seatNumbers: string[]
  ): Promise<void> {
    for (const seatNumber of seatNumbers) {
      await seatRepository.updateSeatStatus(
        routeId,
        new Date(departureDate),
        seatNumber,
        'BOOKED'
      );
    }
  }

  /**
   * Release seats (for cancellation or expiration)
   */
  async releaseSeats(
    routeId: string,
    departureDate: string,
    seatNumbers: string[]
  ): Promise<void> {
    for (const seatNumber of seatNumbers) {
      await prisma.bookingSeat.deleteMany({
        where: {
          routeId,
          departureDate: new Date(departureDate),
          seatNumber,
        },
      });
    }
  }

  /**
   * Clean up expired holds (should be called by a cron job)
   */
  async cleanupExpiredHolds(): Promise<number> {
    return seatRepository.releaseExpiredHolds();
  }

  /**
   * Get all bus templates
   */
  async getAllBusTemplates(): Promise<BusTemplate[]> {
    return await prisma.busTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get bus template by ID with seats
   */
  async getBusTemplateWithSeats(templateId: string): Promise<(BusTemplate & { seats: Seat[] }) | null> {
    return await prisma.busTemplate.findUnique({
      where: { id: templateId },
      include: {
        seats: {
          where: { isAvailable: true },
          orderBy: [
            { floor: 'asc' },
            { rowNumber: 'asc' },
            { columnPosition: 'asc' },
          ],
        },
      },
    });
  }
}

export const seatService = new SeatService();
