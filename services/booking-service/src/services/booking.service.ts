import { v4 as uuidv4 } from 'uuid';
import { customAlphabet } from 'nanoid';
import { config } from '../config';
import { BookingRepository, type AdminBookingRow } from '../repositories/booking.repository';
import { SeatRepository } from '../repositories/seat.repository';
import {
  prisma,
  Prisma,
  BookingStatus,
  SeatStatus,
  RouteStatus,
  Route,
  writeAuditLog,
} from '@vexeviet/database';
import {
  CreateBookingRequest,
  CreateBookingResponse,
  BookingDetailResponse,
  BookingQuery,
  PaginatedResponse,
  PriceBreakdown,
  TokenPayload,
  AdminBooking,
  AdminBookingQuery,
  AdminDashboardStats,
  DashboardPoint,
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

    // Support both 'seats' and 'seatNumbers' from request
    const selectedSeats = data.seats || (data as any).seatNumbers || [];
    const seatCount = Array.isArray(selectedSeats) ? selectedSeats.length : 0;
    const passengerCount = Array.isArray(data.passengers) ? data.passengers.length : 0;

    // 3. Validate passengers match seats
    if (passengerCount > 0 && seatCount > 0 && passengerCount !== seatCount) {
      throw new ConflictError('Number of passengers must match number of seats');
    }

    // 4. Validate max seats per booking
    if (seatCount > config.booking.maxSeatsPerBooking) {
      throw new ConflictError(
        `Maximum ${config.booking.maxSeatsPerBooking} seats allowed per booking`
      );
    }

    if (seatCount === 0) {
      throw new ConflictError('At least one seat must be selected');
    }

    const departureDate = new Date(data.departureDate || new Date());

    // 5. Check seat availability
    const availability = await this.seatRepo.checkAvailability(
      data.routeId,
      departureDate,
      selectedSeats
    );

    if (!availability.available) {
      throw new SeatsUnavailableError(availability.unavailableSeats);
    }

    // 6. Calculate price
    const priceBreakdown = this.calculatePrice(
      Number(route.price),
      selectedSeats.length,
      data.addons
    );

    // 7. Generate booking code
    const bookingCode = `${config.booking.codePrefix}${generateBookingCode()}`;

    // 8. Calculate payment deadline
    const paymentDeadline = new Date(
      Date.now() + config.booking.paymentDeadlineMinutes * 60 * 1000
    );

    // 9. Create booking with transaction
    const holdId = uuidv4();
    const booking = await prisma.$transaction(async (_tx) => {
      // Hold seats first
      await this.seatRepo.holdSeats(
        data.routeId,
        departureDate,
        selectedSeats,
        holdId,
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
        contactEmail: data.contactInfo?.email || (data as any).contactEmail || '',
        contactPhone: data.contactInfo?.phone || (data as any).contactPhone || '',
        promoCode: data.promoCode,
        idempotencyKey: data.idempotencyKey,
        notes: data.notes,
      };

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

      // Create booking with nested passengers and seats
      return this.bookingRepo.create(bookingData, passengers, bookingSeats);
    });

    // 10. Update seat records with actual booking ID using holdId
    await prisma.bookingSeat.updateMany({
      where: {
        holdId: holdId,
      },
      data: {
        bookingId: booking.id,
      },
    });

    // 11. Return response
    return this.formatCreateBookingResponse(booking, route, data, priceBreakdown, selectedSeats);
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
    await this.seatRepo.releaseSeatsByBookingId(bookingId);

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

    const updatedBooking = await this.bookingRepo.updateStatus(
      bookingId,
      BookingStatus.CONFIRMED,
      { confirmedAt: new Date() }
    );

    await this.seatRepo.confirmSeatsByBookingId(bookingId);

    // Audit row emitted at the actual status transition (PENDING → CONFIRMED).
    // `writeAuditLog` never throws, so it cannot fail this request.
    await writeAuditLog({
      actorId: null,
      actorName: 'SYSTEM',
      actorRole: 'SYSTEM',
      action: 'BOOKING_CONFIRMED',
      target: `booking:${booking.bookingCode}`,
      targetId: booking.id,
      severity: 'INFO',
      metadata: { bookingCode: booking.bookingCode, previousStatus: booking.status },
    });

    return this.formatBookingDetailResponse(updatedBooking);
  }

  async markPaymentFailed(bookingId: string, reason?: string): Promise<BookingDetailResponse> {
    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking', bookingId);
    }

    if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.COMPLETED) {
      throw new ConflictError(`Cannot mark payment failed for booking with status: ${booking.status}`);
    }

    const updatedBooking = await this.bookingRepo.updateStatus(bookingId, BookingStatus.CANCELLED, {
      cancelledAt: new Date(),
      cancellationReason: reason || 'Payment failed',
    });

    await this.seatRepo.releaseSeatsByBookingId(bookingId);

    // Audit row emitted at the actual status transition (→ CANCELLED by payment failure).
    await writeAuditLog({
      actorId: null,
      actorName: 'SYSTEM',
      actorRole: 'SYSTEM',
      action: 'BOOKING_PAYMENT_FAILED',
      target: `booking:${booking.bookingCode}`,
      targetId: booking.id,
      severity: 'WARNING',
      metadata: {
        bookingCode: booking.bookingCode,
        previousStatus: booking.status,
        reason: reason ?? 'Payment failed',
      },
    });

    return this.formatBookingDetailResponse(updatedBooking);
  }

  // =====================================================
  // ADMIN
  // =====================================================

  /**
   * Paginated admin booking list (contract Shape 1).
   *
   * Scoping: an OPERATOR token is forced to `route.operatorId === token.userId`
   * and any `operatorId` query param is discarded. ADMIN sees everything and may
   * narrow by `operatorId`.
   */
  async getAdminBookings(
    actor: TokenPayload,
    query: AdminBookingQuery
  ): Promise<PaginatedResponse<AdminBooking>> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const where = this.buildAdminWhere(actor, query);

    // `paymentStatus` filters on the booking's *latest* payment (same rule the
    // response field uses), which Prisma's relation filters cannot express
    // exactly. It is resolved to an ID set in one aggregate query — never a
    // per-row lookup.
    if (query.paymentStatus) {
      const ids = await this.bookingRepo.findIdsByLatestPaymentStatus(query.paymentStatus);

      if (ids.length === 0) {
        return {
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }

      where.id = { in: ids };
    }

    const orderBy: Prisma.BookingOrderByWithRelationInput = this.buildAdminOrderBy(query.sort);

    const [rows, total] = await Promise.all([
      this.bookingRepo.findAdminPage({ where, orderBy, skip, take: limit }),
      this.bookingRepo.countAdmin(where),
    ]);

    return {
      data: rows.map(row => this.formatAdminBooking(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Dashboard aggregates (contract Shape 1 dashboard).
   *
   * Window = `days` calendar days ending today, `[startOfDay(days-1 ago), startOfTomorrow)`.
   * Every time-scoped figure (revenue, payments needing action, revenue trend,
   * status summary) uses that window; `activeRoutes` / `operatorCount` are
   * current-state counts.
   */
  async getAdminDashboard(days: number): Promise<AdminDashboardStats> {
    const { from, to, dayStarts } = this.buildWindow(days);

    const [
      todayBookings,
      revenueCompleted,
      paymentsNeedingAction,
      activeRoutes,
      operatorCount,
      revenueRows,
      statusGroups,
    ] = await Promise.all([
      this.bookingRepo.countCreatedSince(this.startOfToday()),
      this.bookingRepo.sumCompletedPayments(from, to),
      this.bookingRepo.countPaymentsNeedingAction(from, to),
      this.bookingRepo.countActiveRoutes(),
      this.bookingRepo.countActiveOperators(),
      // Day buckets must use the same "local day" definition as the labels
      // below and as "today 00:00 local", so the offset is passed explicitly.
      this.bookingRepo.findRevenueTrend(from, to, this.localUtcOffsetMinutes(from)),
      this.bookingRepo.countByStatusSince(from),
    ]);

    // Zero-fill: one point per day in the window, in chronological order.
    const revenueByDay = new Map<string, Prisma.Decimal>();
    for (const row of revenueRows) {
      revenueByDay.set(row.day, row.total ?? new Prisma.Decimal(0));
    }

    const revenueTrend: DashboardPoint[] = dayStarts.map(day => ({
      label: day.label,
      value: Math.round(Number(revenueByDay.get(day.label) ?? 0)),
    }));

    const bookingStatusSummary: DashboardPoint[] = statusGroups.map(group => ({
      label: group.status,
      value: group.count,
    }));

    return {
      todayBookings,
      revenueCompleted: Math.round(Number(revenueCompleted)),
      paymentsNeedingAction,
      activeRoutes,
      operatorCount,
      revenueTrend,
      bookingStatusSummary,
    };
  }

  /** Build the `where` for the admin list, applying JWT-derived operator scoping. */
  private buildAdminWhere(
    actor: TokenPayload,
    query: AdminBookingQuery
  ): Prisma.BookingWhereInput {
    const where: Prisma.BookingWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    // OPERATOR scoping always wins over the query param — never trust it.
    if (actor.role === 'OPERATOR') {
      where.route = { operatorId: actor.userId };
    } else if (query.operatorId) {
      where.route = { operatorId: query.operatorId };
    }

    if (query.from || query.to) {
      where.departureDate = {
        ...(query.from ? { gte: this.parseDateStart(query.from) } : {}),
        ...(query.to ? { lte: this.parseDateEnd(query.to) } : {}),
      };
    }

    if (query.q) {
      const contains = query.q;
      // MySQL's default collation is case-insensitive, so `contains` is already
      // case-insensitive here (Prisma's `mode: 'insensitive'` is PostgreSQL-only).
      where.OR = [
        { bookingCode: { contains } },
        {
          user: {
            is: {
              OR: [
                { email: { contains } },
                { firstName: { contains } },
                { lastName: { contains } },
              ],
            },
          },
        },
        { contactEmail: { contains } },
      ];
    }

    return where;
  }

  /** Map the contract's `sort` token to a Prisma `orderBy`. */
  private buildAdminOrderBy(sort: AdminBookingQuery['sort']): Prisma.BookingOrderByWithRelationInput {
    const descending = sort.startsWith('-');
    const field = descending ? sort.slice(1) : sort;

    if (field === 'departureDate') {
      return { departureDate: descending ? 'desc' : 'asc' };
    }

    return { createdAt: descending ? 'desc' : 'asc' };
  }

  /** Map a loaded admin row to the contract's AdminBooking shape. */
  private formatAdminBooking(row: AdminBookingRow): AdminBooking {
    const { user, route } = row;

    const fullName = [user?.firstName, user?.lastName]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(' ')
      .trim();

    const seatNumbers = row.seats.map(seat => seat.seatNumber);
    const fallbackSeats = row.passengers.map(passenger => passenger.seatNumber);
    const seats = (seatNumbers.length > 0 ? seatNumbers : fallbackSeats)
      .slice()
      .sort((a, b) => a.localeCompare(b));

    const operatorName = [route.operator?.firstName, route.operator?.lastName]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(' ')
      .trim();

    return {
      id: row.id,
      bookingCode: row.bookingCode,
      customerName: fullName || row.contactEmail || 'Guest',
      customerEmail: user?.email ?? row.contactEmail,
      customerPhone: user?.phone ?? row.contactPhone,
      operatorId: route.operatorId,
      operatorName: operatorName || 'Unknown Operator',
      routeId: route.id,
      routeName: `${route.origin} → ${route.destination}`,
      departureDate: this.formatUtcDateOnly(row.departureDate),
      seats,
      status: row.status,
      paymentStatus: row.payments[0]?.status ?? null,
      // Decimal → number only here, at the response boundary.
      totalAmount:
        Math.round(
          (Number(row.totalPrice) + Number(row.serviceFee) - Number(row.discount)) * 100
        ) / 100,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Local midnight at the start of today (contract: "today 00:00 local"). */
  private startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * The dashboard window: `days` calendar days ending today.
   * Returns the SQL bounds plus one zero-filled bucket per day.
   */
  private buildWindow(days: number): {
    from: Date;
    to: Date;
    dayStarts: { label: string; at: Date }[];
  } {
    const today = this.startOfToday();
    const from = new Date(today);
    from.setDate(from.getDate() - (days - 1));

    const to = new Date(today);
    to.setDate(to.getDate() + 1);

    const dayStarts: { label: string; at: Date }[] = [];
    for (let i = 0; i < days; i += 1) {
      const at = new Date(from);
      at.setDate(from.getDate() + i);
      dayStarts.push({ label: this.formatLocalDate(at), at });
    }

    return { from, to, dayStarts };
  }

  /** Minutes east of UTC for `date` (e.g. +420 for UTC+7). */
  private localUtcOffsetMinutes(date: Date): number {
    // getTimezoneOffset() returns minutes *behind* UTC, so negate it.
    return -date.getTimezoneOffset();
  }

  /**
   * Format a Date as `YYYY-MM-DD` **in UTC**.
   *
   * Use for values read from a `@db.Date` column: MySQL `DATE` has no time or
   * zone, Prisma surfaces it as UTC midnight, so the UTC view is the stored day.
   * Using local getters would shift e.g. `2026-06-08` to `2026-06-07` west of UTC.
   */
  private formatUtcDateOnly(value: Date): string {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format a Date as `YYYY-MM-DD` **in the server's local zone**.
   *
   * Use for calendar-day buckets the service itself computes (the dashboard
   * window), which are anchored to local midnight to match
   * "bookings created since today 00:00 local".
   */
  private formatLocalDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Start of the given ISO date, as UTC midnight.
   *
   * `booking.departureDate` is a `@db.Date` column, which Prisma compares as UTC
   * midnight — a local-midnight bound would clip or admit a day at the edges
   * depending on the server's zone.
   */
  private parseDateStart(value: string): Date {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  /** End of the given ISO date, as UTC end-of-day (inclusive). */
  private parseDateEnd(value: string): Date {
    return new Date(`${value.slice(0, 10)}T23:59:59.999Z`);
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
    priceBreakdown: PriceBreakdown,
    selectedSeats?: string[]
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
        operatorName: route.operator 
          ? `${route.operator.firstName} ${route.operator.lastName}` 
          : 'Unknown Operator',
      },
      passengers: request.passengers,
      seats: selectedSeats || request.seats,
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
