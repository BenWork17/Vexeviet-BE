import { prisma, Prisma, Booking, BookingStatus, SeatStatus } from '@vexeviet/database';

export class BookingRepository {
  /**
   * Create a new booking with passengers and seats
   */
  async create(
    data: Prisma.BookingCreateInput,
    passengers: Prisma.BookingPassengerCreateManyBookingInput[],
    seats: Omit<Prisma.BookingSeatCreateManyBookingInput, 'bookingId'>[]
  ): Promise<Booking & { passengers: { id: string; seatNumber: string }[]; seats: { seatNumber: string; status: SeatStatus }[] }> {
    return prisma.booking.create({
      data: {
        ...data,
        passengers: {
          createMany: {
            data: passengers,
          },
        },
        seats: {
          createMany: {
            data: seats.map(seat => ({
              ...seat,
              routeId: data.route?.connect?.id as string,
            })),
          },
        },
      },
      include: {
        passengers: {
          select: {
            id: true,
            seatNumber: true,
          },
        },
        seats: {
          select: {
            seatNumber: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Find booking by ID with relations
   */
  async findById(id: string): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: { id },
      include: {
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
            departureLocation: true,
            arrivalLocation: true,
            departureTime: true,
            arrivalTime: true,
            duration: true,
            busType: true,
            price: true,
            operator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        passengers: true,
        seats: true,
      },
    });
  }

  /**
   * Find booking by booking code
   */
  async findByCode(bookingCode: string): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: { bookingCode },
      include: {
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
            departureLocation: true,
            arrivalLocation: true,
            departureTime: true,
            arrivalTime: true,
            duration: true,
            busType: true,
            price: true,
            operator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        passengers: true,
        seats: true,
      },
    });
  }

  /**
   * Find booking by idempotency key
   */
  async findByIdempotencyKey(key: string): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: { idempotencyKey: key },
      include: {
        passengers: true,
        seats: true,
      },
    });
  }

  /**
   * Find many bookings with pagination
   */
  async findMany(params: {
    where?: Prisma.BookingWhereInput;
    orderBy?: Prisma.BookingOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<Booking[]> {
    return prisma.booking.findMany({
      ...params,
      include: {
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
            departureTime: true,
            arrivalTime: true,
            busType: true,
          },
        },
        passengers: {
          select: {
            firstName: true,
            lastName: true,
            seatNumber: true,
          },
        },
      },
    });
  }

  /**
   * Count bookings
   */
  async count(where?: Prisma.BookingWhereInput): Promise<number> {
    return prisma.booking.count({ where });
  }

  /**
   * Update booking
   */
  async update(id: string, data: Prisma.BookingUpdateInput): Promise<Booking> {
    return prisma.booking.update({
      where: { id },
      data,
      include: {
        passengers: true,
        seats: true,
      },
    });
  }

  /**
   * Update booking status
   */
  async updateStatus(
    id: string,
    status: BookingStatus,
    additionalData?: Partial<{
      confirmedAt: Date;
      cancelledAt: Date;
      cancellationReason: string;
    }>
  ): Promise<Booking> {
    return prisma.booking.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    });
  }

  /**
   * Find user's bookings
   */
  async findByUserId(
    userId: string,
    skip?: number,
    take?: number
  ): Promise<Booking[]> {
    return prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
            departureTime: true,
            arrivalTime: true,
            busType: true,
          },
        },
        passengers: {
          select: {
            firstName: true,
            lastName: true,
            seatNumber: true,
          },
        },
      },
    });
  }

  /**
   * Find expired pending bookings
   */
  async findExpiredPendingBookings(): Promise<Booking[]> {
    return prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        paymentDeadline: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * Expire bookings (batch update)
   */
  async expireBookings(bookingIds: string[]): Promise<number> {
    const result = await prisma.booking.updateMany({
      where: {
        id: { in: bookingIds },
        status: BookingStatus.PENDING,
      },
      data: {
        status: BookingStatus.EXPIRED,
      },
    });
    return result.count;
  }
}
