import { customAlphabet } from 'nanoid';
import { config } from '../config';
import { BookingRepository } from '../repositories/booking.repository';
import { SeatRepository } from '../repositories/seat.repository';
import { prisma, Prisma, BookingStatus, SeatStatus, RouteStatus, Route } from '@vexeviet/database';
import {
  CreateBookingRequest,
  CreateBookingResponse,
  BookingDetailResponse,
  BookingQuery,
  PaginatedResponse,
  PriceBreakdown,
} from '../types';
import {
  NotFoundError,
  SeatsUnavailableError,
  BookingExpiredError,
  ConflictError,
} from '../middlewares/error.middleware';

// Generate booking code: VXV + 7 alphanumeric characters
const generateBookingCode = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 7);

export class BookingService {
  private bookingRepo: BookingRepository;
  private seatRepo: SeatRepository;

  constructor() {
    this.bookingRepo = new BookingRepository();
    this.seatRepo = new SeatRepository();
  }

  /**
   * Create a new booking with seat reservation
   */
  async createBooking(
    userId: string,
    data: CreateBookingRequest
  ): Promise<CreateBookingResponse> {
    // 1. Check idempotency
    const existingBooking = await this.bookingRepo.findByIdempotencyKey(data.idempotencyKey);
    if (existingBooking) {
      return this.formatBookingResponse(existingBooking);
    }

    // 2. Validate route exists and is active
    const route = await prisma.route.findFirst({
      where: {
        id: data.routeId,
        status: RouteStatus.ACTIVE,
      },
      include: {
        operator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!route) {
      throw new NotFoundError('Route', data.routeId);
    }

    // 3. Validate passengers match seats
    if (data.passengers.length !== data.seats.length) {
      throw new ConflictError('Number of passengers must match number of seats');
    }

    // 4. Validate max seats per booking
    if (data.seats.length > config.booking.maxSeatsPerBooking) {
      throw new ConflictError(
        `Maximum ${config.booking.maxSeatsPerBooking} seats allowed per booking`
      );
    }

    const departureDate = new Date(data.departureDate);

    // 5. Check seat availability
    const availability = await this.seatRepo.checkAvailability(
      data.routeId,
      departureDate,
      data.seats
    );

    if (!availability.available) {
      throw new SeatsUnavailableError(availability.unavailableSeats);
    }

    // 6. Calculate price
    const priceBreakdown = this.calculatePrice(
      Number(route.price),
      data.seats.length,
      data.addons
    );

    // 7. Generate booking code
    const bookingCode = `${config.booking.codePrefix}${generateBookingCode()}`;

    // 8. Calculate payment deadline
    const paymentDeadline = new Date(
      Date.now() + config.booking.paymentDeadlineMinutes * 60 * 1000
    );

    // 9. Create booking with transaction
    const booking = await prisma.$transaction(async (_tx) => {
      // Hold seats first
      await this.seatRepo.holdSeats(
        data.routeId,
        departureDate,
        data.seats,
        'temp', // Will update with actual booking ID
        config.booking.seatHoldTTL
      );

      // Create booking
      const bookingData: Prisma.BookingCreateInput = {
        bookingCode,
        user: { connect: { id: userId } },
        route: { connect: { id: data.routeId } },
        departureDate,
        status: BookingStatus.PENDING,
        totalPrice: priceBreakdown.total,
        serviceFee: priceBreakdown.serviceFee,
        discount: priceBreakdown.discount || 0,
        paymentDeadline,
        pickupPointId: data.pickupPointId,
        dropoffPointId: data.dropoffPointId,
        contactEmail: data.contactInfo.email,
        contactPhone: data.contactInfo.phone,
        promoCode: data.promoCode,
        idempotencyKey: data.idempotencyKey,
        notes: data.notes,
      };

      const passengers = data.passengers.map((p, index) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        seatNumber: data.seats[index],
        idNumber: p.idNumber,
        dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : undefined,
      }));

      const seats = data.seats.map(seatNumber => ({
        routeId: data.routeId,
        departureDate,
        seatNumber,
        status: SeatStatus.HELD,
        lockedAt: new Date(),
        lockedUntil: paymentDeadline,
      }));

      // Create booking with nested passengers and seats
      return this.bookingRepo.create(bookingData, passengers, seats);
    });

    // 10. Update seat records with actual booking ID
    await prisma.bookingSeat.updateMany({
      where: {
        routeId: data.routeId,
        departureDate,
        seatNumber: { in: data.seats },
      },
      data: {
        bookingId: booking.id,
      },
    });

    // 11. Return response
    return this.formatCreateBookingResponse(booking, route, data, priceBreakdown);
  }

  /**
   * Get booking by ID
   */
  async getBookingById(
    bookingId: string,
    userId?: string
  ): Promise<BookingDetailResponse> {
    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking', bookingId);
    }

    // Check ownership if userId provided
    if (userId && booking.userId !== userId) {
      throw new NotFoundError('Booking', bookingId);
    }

    return this.formatBookingDetailResponse(booking);
  }

  /**
   * Get booking by code
   */
  async getBookingByCode(
    bookingCode: string,
    userId?: string
  ): Promise<BookingDetailResponse> {
    const booking = await this.bookingRepo.findByCode(bookingCode);

    if (!booking) {
      throw new NotFoundError('Booking', bookingCode);
    }

    // Check ownership if userId provided
    if (userId && booking.userId !== userId) {
      throw new NotFoundError('Booking', bookingCode);
    }

    return this.formatBookingDetailResponse(booking);
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(
    userId: string,
    query: BookingQuery
  ): Promise<PaginatedResponse<BookingDetailResponse>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = { userId };

    if (query.status) {
      where.status = query.status;
    }
    if (query.fromDate) {
      where.departureDate = { gte: new Date(query.fromDate) };
    }
    if (query.toDate) {
      where.departureDate = {
        ...(where.departureDate as Prisma.DateTimeFilter),
        lte: new Date(query.toDate),
      };
    }

    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder);

    const [bookings, total] = await Promise.all([
      this.bookingRepo.findMany({ where, orderBy, skip, take: limit }),
      this.bookingRepo.count(where),
    ]);

    return {
      data: bookings.map(b => this.formatBookingDetailResponse(b)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancel booking
   */
  async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string
  ): Promise<BookingDetailResponse> {
    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking', bookingId);
    }

    if (booking.userId !== userId) {
      throw new NotFoundError('Booking', bookingId);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictError('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new ConflictError('Cannot cancel completed booking');
    }

    // Update booking status
    const updatedBooking = await this.bookingRepo.updateStatus(
      bookingId,
      BookingStatus.CANCELLED,
      {
        cancelledAt: new Date(),
        cancellationReason: reason,
      }
    );

    // Release seats
    await this.seatRepo.releaseSeats(bookingId);

    return this.formatBookingDetailResponse(updatedBooking);
  }

  /**
   * Confirm booking (called after payment success)
   */
  async confirmBooking(bookingId: string): Promise<BookingDetailResponse> {
    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking', bookingId);
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictError(`Cannot confirm booking with status: ${booking.status}`);
    }

    if (new Date() > booking.paymentDeadline) {
      throw new BookingExpiredError(booking.bookingCode);
    }

    // Update booking status
    const updatedBooking = await this.bookingRepo.updateStatus(
      bookingId,
      BookingStatus.CONFIRMED,
      { confirmedAt: new Date() }
    );

    // Confirm seats
    await this.seatRepo.confirmSeats(bookingId);

    return this.formatBookingDetailResponse(updatedBooking);
  }

  /**
   * Calculate price breakdown
   */
  private calculatePrice(
    ticketPrice: number,
    seatCount: number,
    addons?: CreateBookingRequest['addons']
  ): PriceBreakdown {
    const tickets = ticketPrice * seatCount;
    let insurance = 0;
    let meal = 0;
    let extraLuggage = 0;

    if (addons?.insurance) {
      insurance = 50000 * seatCount; // 50,000 VND per person
    }
    if (addons?.meal) {
      meal = 30000 * seatCount; // 30,000 VND per person
    }
    if (addons?.extraLuggage) {
      extraLuggage = 100000; // 100,000 VND flat
    }

    const subtotal = tickets + insurance + meal + extraLuggage;
    const serviceFee = Math.round(subtotal * (config.booking.serviceFeePercent / 100));
    const discount = 0; // TODO: Apply promo code

    return {
      tickets,
      insurance: insurance || undefined,
      meal: meal || undefined,
      extraLuggage: extraLuggage || undefined,
      serviceFee,
      discount: discount || undefined,
      total: subtotal + serviceFee - discount,
    };
  }

  /**
   * Build order by clause
   */
  private buildOrderBy(
    sortBy?: string,
    sortOrder?: string
  ): Prisma.BookingOrderByWithRelationInput {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    switch (sortBy) {
      case 'departureDate':
        return { departureDate: order };
      case 'totalPrice':
        return { totalPrice: order };
      case 'createdAt':
      default:
        return { createdAt: order };
    }
  }

  /**
   * Format booking response (minimal)
   */
  private formatBookingResponse(booking: any): CreateBookingResponse {
    return {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      route: {
        id: booking.route?.id || booking.routeId,
        name: booking.route?.name || '',
        origin: booking.route?.origin || '',
        destination: booking.route?.destination || '',
        departureLocation: booking.route?.departureLocation,
        arrivalLocation: booking.route?.arrivalLocation,
        departureTime: booking.route?.departureTime?.toISOString() || '',
        arrivalTime: booking.route?.arrivalTime?.toISOString() || '',
        duration: booking.route?.duration || 0,
        busType: booking.route?.busType || 'STANDARD',
        operatorName: booking.route?.operator
          ? `${booking.route.operator.firstName} ${booking.route.operator.lastName}`
          : '',
      },
      passengers: booking.passengers?.map((p: any) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        seatNumber: p.seatNumber,
        idNumber: p.idNumber,
        dateOfBirth: p.dateOfBirth?.toISOString(),
      })) || [],
      seats: booking.seats?.map((s: any) => s.seatNumber) || [],
      totalPrice: {
        amount: Number(booking.totalPrice),
        currency: 'VND',
        breakdown: {
          tickets: Number(booking.totalPrice) - Number(booking.serviceFee) + Number(booking.discount || 0),
          serviceFee: Number(booking.serviceFee),
          discount: Number(booking.discount || 0),
          total: Number(booking.totalPrice),
        },
      },
      paymentDeadline: booking.paymentDeadline.toISOString(),
      createdAt: booking.createdAt.toISOString(),
    };
  }

  /**
   * Format create booking response
   */
  private formatCreateBookingResponse(
    booking: any,
    route: Route & { operator: { id: string; firstName: string; lastName: string } },
    request: CreateBookingRequest,
    priceBreakdown: PriceBreakdown
  ): CreateBookingResponse {
    return {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      route: {
        id: route.id,
        name: route.name,
        origin: route.origin,
        destination: route.destination,
        departureLocation: route.departureLocation,
        arrivalLocation: route.arrivalLocation,
        departureTime: route.departureTime.toISOString(),
        arrivalTime: route.arrivalTime.toISOString(),
        duration: route.duration,
        busType: route.busType,
        operatorName: `${route.operator.firstName} ${route.operator.lastName}`,
      },
      passengers: request.passengers,
      seats: request.seats,
      totalPrice: {
        amount: priceBreakdown.total,
        currency: 'VND',
        breakdown: priceBreakdown,
      },
      paymentDeadline: booking.paymentDeadline.toISOString(),
      createdAt: booking.createdAt.toISOString(),
    };
  }

  /**
   * Format booking detail response
   */
  private formatBookingDetailResponse(booking: any): BookingDetailResponse {
    const baseResponse = this.formatBookingResponse(booking);
    return {
      ...baseResponse,
      pickupPointId: booking.pickupPointId || '',
      dropoffPointId: booking.dropoffPointId || '',
      contactInfo: {
        email: booking.contactEmail,
        phone: booking.contactPhone,
      },
      promoCode: booking.promoCode,
      confirmedAt: booking.confirmedAt?.toISOString(),
      cancelledAt: booking.cancelledAt?.toISOString(),
      cancellationReason: booking.cancellationReason,
      notes: booking.notes,
    };
  }
}
