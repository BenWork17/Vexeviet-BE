import { v4 as uuidv4 } from 'uuid';
import { customAlphabet } from 'nanoid';
import {
  prisma,
  Prisma,
  BookingStatus,
  SeatStatus,
  RouteStatus,
} from '@vexeviet/database';
import { config } from '../config';
import { BookingRepository } from '../repositories/booking.repository';
import { SeatRepository } from '../repositories/seat.repository';
import { BookingAdminService } from './booking-admin.service';
import { BookingInternalService } from './booking-internal.service';
import {
  calculateBookingPrice,
  formatBookingDetailResponse,
  formatBookingResponse,
  formatCreateBookingResponse,
} from './booking-formatters';
import {
  CreateBookingRequest,
  CreateBookingResponse,
  BookingDetailResponse,
  BookingQuery,
  PaginatedResponse,
  TokenPayload,
  UserRole,
  AdminBooking,
  AdminBookingQuery,
  AdminDashboardStats,
  AdminBulkCancelResponse,
  AdminBulkConfirmResponse,
} from '../types';
import {
  NotFoundError,
  SeatsUnavailableError,
  ConflictError,
} from '../middlewares/error.middleware';

const generateBookingCode = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 7);

export class BookingService {
  private bookingRepo: BookingRepository;
  private seatRepo: SeatRepository;
  private internalService: BookingInternalService;
  private adminService: BookingAdminService;

  constructor() {
    this.bookingRepo = new BookingRepository();
    this.seatRepo = new SeatRepository();
    this.internalService = new BookingInternalService(this.bookingRepo, this.seatRepo);
    this.adminService = new BookingAdminService(this.bookingRepo, this.seatRepo);
  }

  async createBooking(
    userId: string,
    data: CreateBookingRequest
  ): Promise<CreateBookingResponse> {
    const existingBooking = await this.bookingRepo.findByIdempotencyKey(data.idempotencyKey);
    if (existingBooking) {
      return formatBookingResponse(existingBooking);
    }

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
            operatorAvatarUrl: true,
          },
        },
      },
    });

    if (!route) {
      throw new NotFoundError('Route', data.routeId);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedSeats = data.seats || (data as any).seatNumbers || [];
    const seatCount = Array.isArray(selectedSeats) ? selectedSeats.length : 0;
    const passengerCount = Array.isArray(data.passengers) ? data.passengers.length : 0;

    if (passengerCount > 0 && seatCount > 0 && passengerCount !== seatCount) {
      throw new ConflictError('Number of passengers must match number of seats');
    }

    if (seatCount > config.booking.maxSeatsPerBooking) {
      throw new ConflictError(
        `Maximum ${config.booking.maxSeatsPerBooking} seats allowed per booking`
      );
    }

    if (seatCount === 0) {
      throw new ConflictError('At least one seat must be selected');
    }

    const departureDate = new Date(data.departureDate || new Date());

    const availability = await this.seatRepo.checkAvailability(
      data.routeId,
      departureDate,
      selectedSeats
    );

    if (!availability.available) {
      throw new SeatsUnavailableError(availability.unavailableSeats);
    }

    const priceBreakdown = calculateBookingPrice(
      Number(route.price),
      selectedSeats.length,
      data.addons
    );

    const bookingCode = `${config.booking.codePrefix}${generateBookingCode()}`;
    const paymentDeadline = new Date(
      Date.now() + config.booking.paymentDeadlineMinutes * 60 * 1000
    );

    const holdId = uuidv4();
    const booking = await prisma.$transaction(async () => {
      await this.seatRepo.holdSeats(
        data.routeId,
        departureDate,
        selectedSeats,
        holdId,
        config.booking.seatHoldTTL
      );

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contactEmail: data.contactInfo?.email || (data as any).contactEmail || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contactPhone: data.contactInfo?.phone || (data as any).contactPhone || '',
        promoCode: data.promoCode,
        idempotencyKey: data.idempotencyKey,
        notes: data.notes,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const passengers = (data.passengers || []).map((p: any, index: number) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        seatNumber: p.seatNumber || (Array.isArray(selectedSeats) ? selectedSeats[index] : ''),
        idNumber: p.idNumber,
        dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : undefined,
      }));

      const bookingSeats = (selectedSeats || []).map((seatNumber: string) => ({
        routeId: data.routeId,
        departureDate,
        seatNumber,
        status: SeatStatus.HELD,
        lockedAt: new Date(),
        lockedUntil: paymentDeadline,
        holdId,
      }));

      return this.bookingRepo.create(bookingData, passengers, bookingSeats);
    });

    await prisma.bookingSeat.updateMany({
      where: { holdId },
      data: { bookingId: booking.id },
    });

    return formatCreateBookingResponse(booking, route, data, priceBreakdown, selectedSeats);
  }

  async getBookingById(
    bookingId: string,
    userId?: string,
    role?: UserRole
  ): Promise<BookingDetailResponse> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking', bookingId);
    }
    if (userId && !this.canReadBooking(booking, { userId, role })) {
      throw new NotFoundError('Booking', bookingId);
    }
    return formatBookingDetailResponse(booking);
  }

  private canReadBooking(
    booking: { userId: string; route?: { operatorId: string } | null },
    actor: { userId: string; role?: UserRole }
  ): boolean {
    if (booking.userId === actor.userId) return true;
    return actor.role === 'OPERATOR' && booking.route?.operatorId === actor.userId;
  }

  async getBookingByCode(
    bookingCode: string,
    userId?: string,
    role?: UserRole
  ): Promise<BookingDetailResponse> {
    const booking = await this.bookingRepo.findByCode(bookingCode);
    if (!booking) {
      throw new NotFoundError('Booking', bookingCode);
    }
    if (userId && !this.canReadBooking(booking, { userId, role })) {
      throw new NotFoundError('Booking', bookingCode);
    }
    return formatBookingDetailResponse(booking);
  }

  async getUserBookings(
    userId: string,
    query: BookingQuery
  ): Promise<PaginatedResponse<BookingDetailResponse>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = { userId };
    if (query.status) where.status = query.status;
    if (query.fromDate) where.departureDate = { gte: new Date(query.fromDate) };
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
      data: bookings.map((b) => formatBookingDetailResponse(b)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    reason?: string
  ): Promise<BookingDetailResponse> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking || booking.userId !== userId) {
      throw new NotFoundError('Booking', bookingId);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictError('Booking is already cancelled');
    }
    if (booking.status === BookingStatus.COMPLETED) {
      throw new ConflictError('Cannot cancel completed booking');
    }

    const updatedBooking = await this.bookingRepo.updateStatus(
      bookingId,
      BookingStatus.CANCELLED,
      {
        cancelledAt: new Date(),
        cancellationReason: reason,
      }
    );

    await this.seatRepo.releaseSeatsByBookingId(bookingId);
    return formatBookingDetailResponse(updatedBooking);
  }

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
      default:
        return { createdAt: order };
    }
  }

  // Delegated internal & admin workflows
  confirmBooking(bookingId: string): Promise<BookingDetailResponse> {
    return this.internalService.confirmBooking(bookingId);
  }

  markPaymentFailed(bookingId: string, reason?: string): Promise<BookingDetailResponse> {
    return this.internalService.markPaymentFailed(bookingId, reason);
  }

  getAdminBookings(
    actor: TokenPayload,
    query: AdminBookingQuery
  ): Promise<PaginatedResponse<AdminBooking>> {
    return this.adminService.getAdminBookings(actor, query);
  }

  getAdminDashboard(days: number, actor: TokenPayload): Promise<AdminDashboardStats> {
    return this.adminService.getAdminDashboard(days, actor);
  }

  cancelBookingAsAdmin(
    bookingId: string,
    actor: TokenPayload,
    reason: string
  ): Promise<BookingDetailResponse> {
    return this.adminService.cancelBookingAsAdmin(bookingId, actor, reason);
  }

  cancelBookingsAsAdmin(
    ids: string[],
    actor: TokenPayload,
    reason: string
  ): Promise<AdminBulkCancelResponse> {
    return this.adminService.cancelBookingsAsAdmin(ids, actor, reason);
  }

  confirmBookingsAsAdmin(
    ids: string[],
    actor: TokenPayload
  ): Promise<AdminBulkConfirmResponse> {
    return this.adminService.confirmBookingsAsAdmin(ids, actor);
  }

  updateBookingNotesAsAdmin(
    bookingId: string,
    actor: TokenPayload,
    notes: string | null
  ): Promise<BookingDetailResponse> {
    return this.adminService.updateBookingNotesAsAdmin(bookingId, actor, notes);
  }
}
