import { Booking as PrismaBooking, BookingPassenger as PrismaBookingPassenger, BookingSeat as PrismaBookingSeat, BookingStatus, SeatStatus, UserRole, PaymentStatus, Prisma, SeatType, SeatPosition } from '@vexeviet/database';

// Re-export Prisma types
export type Booking = PrismaBooking;
export type BookingPassenger = PrismaBookingPassenger;
export type BookingSeat = PrismaBookingSeat;
export { BookingStatus, SeatStatus, UserRole, PaymentStatus };

// Token payload from JWT
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// Passenger information for booking
export interface PassengerInfo {
  firstName: string;
  lastName: string;
  seatNumber: string;
  idNumber?: string;
  dateOfBirth?: string;
}

// Contact information
export interface ContactInfo {
  email: string;
  phone: string;
}

// Addon services
export interface BookingAddons {
  insurance?: boolean;
  meal?: boolean;
  extraLuggage?: boolean;
}

// Create booking request - matches SAFe-Backend-Detailed-Specs.md
export interface CreateBookingRequest {
  routeId: string;
  departureDate: string; // YYYY-MM-DD
  passengers: PassengerInfo[];
  seats: string[]; // ["A1", "A2"]
  pickupPointId: string;
  dropoffPointId: string;
  contactInfo: ContactInfo;
  addons?: BookingAddons;
  promoCode?: string;
  idempotencyKey: string; // UUID for preventing duplicates
  notes?: string;
}

// Price breakdown
export interface PriceBreakdown {
  tickets: number;
  insurance?: number;
  meal?: number;
  extraLuggage?: number;
  serviceFee: number;
  discount?: number;
  total: number;
}

// Route snapshot for booking response
export interface RouteSnapshot {
  id: string;
  name: string;
  origin: string;
  destination: string;
  departureLocation: string | null;
  arrivalLocation: string | null;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  busType: string;
  operatorName: string;
}

// Create booking response
export interface CreateBookingResponse {
  bookingId: string;
  bookingCode: string; // VXV123456
  status: BookingStatus;
  route: RouteSnapshot;
  passengers: PassengerInfo[];
  seats: string[];
  totalPrice: {
    amount: number;
    currency: 'VND';
    breakdown: PriceBreakdown;
  };
  paymentDeadline: string; // ISO 8601 (15 minutes from now)
  paymentUrl?: string;
  createdAt: string;
}

// Booking detail response (for GET /bookings/:id)
export interface BookingDetailResponse extends CreateBookingResponse {
  pickupPointId: string;
  dropoffPointId: string;
  contactInfo: ContactInfo;
  promoCode?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  notes?: string;
}

// Cancel booking request
export interface CancelBookingRequest {
  reason?: string;
}

// Booking query parameters
export interface BookingQuery {
  userId?: string;
  status?: BookingStatus;
  routeId?: string;
  departureDate?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'departureDate' | 'totalPrice';
  sortOrder?: 'asc' | 'desc';
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Seat hold request (internal use)
export interface SeatHoldRequest {
  routeId: string;
  departureDate: string;
  seats: string[];
  userId: string;
  ttlSeconds?: number; // Default 900 (15 minutes)
}

// Seat hold response
export interface SeatHoldResponse {
  success: boolean;
  holdId: string;
  seats: string[];
  expiresAt: string;
}

// Seat availability request
export interface SeatAvailabilityRequest {
  routeId: string;
  departureDate: string;
}

/**
 * One seat row in a seat-availability response.
 *
 * Mirrors the object `SeatService.getAvailability` actually builds from the bus
 * template (it already returns all of these fields at runtime — this type only
 * names them, so the `status` field can be typed as `SeatStatus` rather than
 * being inferred as the literal `'AVAILABLE'`).
 */
export interface SeatAvailabilityItem {
  id: string;
  seatNumber: string;
  seatLabel: string;
  row: number;
  column: string;
  floor: number;
  seatType: SeatType;
  position: SeatPosition;
  basePrice: number;
  priceModifier: number;
  finalPrice: number;
  status: SeatStatus;
  isSelectable: boolean;
  metadata: Prisma.JsonValue | null;
}

// Seat availability response
export interface SeatAvailabilityResponse {
  routeId: string;
  departureDate: string;
  totalSeats: number;
  availableSeats: number;
  seats: SeatAvailabilityItem[];
}

// Event types for message queue
export interface BookingCreatedEvent {
  bookingId: string;
  bookingCode: string;
  userId: string;
  routeId: string;
  departureDate: string;
  totalPrice: number;
  seats: string[];
  contactEmail: string;
  createdAt: string;
}

export interface BookingConfirmedEvent {
  bookingId: string;
  bookingCode: string;
  userId: string;
  paymentId?: string;
  confirmedAt: string;
}

export interface BookingCancelledEvent {
  bookingId: string;
  bookingCode: string;
  userId: string;
  reason?: string;
  cancelledAt: string;
  refundAmount?: number;
}

export interface SeatReservedEvent {
  routeId: string;
  departureDate: string;
  seats: string[];
  bookingId: string;
  reservedAt: string;
}

export interface SeatReleasedEvent {
  routeId: string;
  departureDate: string;
  seats: string[];
  bookingId: string;
  releasedAt: string;
}

// Booking code generator config
export interface BookingCodeConfig {
  prefix: string; // e.g., "VXV"
  length: number; // Total length including prefix
}

// Idempotency record
export interface IdempotencyRecord {
  key: string;
  response: string; // JSON stringified response
  createdAt: Date;
  expiresAt: Date;
}

// =====================================================
// ADMIN API TYPES (contract Shape 1)
// =====================================================

/** Sort options accepted by `GET /bookings/admin/all`. */
export type AdminBookingSort =
  | 'createdAt'
  | '-createdAt'
  | 'departureDate'
  | '-departureDate';

/** Query for `GET /bookings/admin/all` — already validated/clamped by the controller. */
export interface AdminBookingQuery {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  operatorId?: string;
  q?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
  sort: AdminBookingSort;
}

/** One row of the admin booking list (contract Shape 1). */
export interface AdminBooking {
  id: string;
  bookingCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  operatorId: string;
  operatorName: string;
  routeId: string;
  routeName: string;
  departureDate: string; // YYYY-MM-DD
  seats: string[];
  status: BookingStatus;
  paymentStatus: PaymentStatus | null;
  totalAmount: number;
  createdAt: string;
}

/** `{ label, value }` point used by dashboard arrays. */
export interface DashboardPoint {
  label: string;
  value: number;
}

/** Response for `GET /bookings/admin/dashboard` (contract Shape 1 dashboard). */
export interface AdminDashboardStats {
  todayBookings: number;
  revenueCompleted: number;
  paymentsNeedingAction: number;
  activeRoutes: number;
  operatorCount: number;
  revenueTrend: DashboardPoint[];
  bookingStatusSummary: DashboardPoint[];
}

// =====================================================
// ADMIN BOOKING ACTIONS (cancel / bulk cancel / notes)
// =====================================================

/** Body of `POST /bookings/admin/:id/cancel`. */
export interface AdminCancelBookingRequest {
  reason: string;
}

/** Body of `POST /bookings/admin/cancel` (bulk). */
export interface AdminBulkCancelRequest {
  ids: string[];
  reason: string;
}

/** Body of `PATCH /bookings/admin/:id/notes`; `null` clears the note. */
export interface AdminBookingNotesRequest {
  notes: string | null;
}

/**
 * Per-item failure codes for a bulk cancel.
 *
 * Deliberately the service's existing error vocabulary (the codes its error
 * classes already emit) rather than a parallel set.
 */
export type AdminBulkCancelErrorCode = 'NOT_FOUND' | 'CONFLICT';

/** One successful item of a bulk cancel. */
export interface AdminBulkCancelItemSuccess {
  id: string;
  ok: true;
  status: 'CANCELLED';
}

/** One failed item of a bulk cancel; the rest of the batch still runs. */
export interface AdminBulkCancelItemFailure {
  id: string;
  ok: false;
  code: AdminBulkCancelErrorCode;
  message: string;
}

export type AdminBulkCancelItem = AdminBulkCancelItemSuccess | AdminBulkCancelItemFailure;

/** Totals for a bulk cancel. */
export interface AdminBulkCancelSummary {
  requested: number;
  cancelled: number;
  failed: number;
}

/** `data` payload of `POST /bookings/admin/cancel`. */
export interface AdminBulkCancelResponse {
  results: AdminBulkCancelItem[];
  summary: AdminBulkCancelSummary;
}

// =====================================================
// ADMIN SEAT MAINTENANCE BLOCKING (`Khóa ghế bảo trì`)
// =====================================================

/** Body of `POST /api/v1/seats/admin/block`. */
export interface AdminSeatBlockRequest {
  routeId: string;
  /** `YYYY-MM-DD`; the block lasts to the end of this service date. */
  departureDate: string;
  seatNumbers: string[];
  /** Required: an unstated maintenance block is unauditable. */
  reason: string;
}

/** Body of `POST /api/v1/seats/admin/unblock` (no reason: unblocking needs none). */
export interface AdminSeatUnblockRequest {
  routeId: string;
  departureDate: string;
  seatNumbers: string[];
}

/**
 * Why one requested seat was not changed by an admin block/unblock.
 *
 * Per-item rather than a whole-request 400: one stale seat number must not
 * prevent an admin from blocking the other 49 seats of a broken row.
 */
export type AdminSeatSkipCode =
  | 'SEAT_NOT_FOUND' // not present in the route's bus template
  | 'SEAT_HELD' // a live customer hold owns it — never stolen
  | 'SEAT_BOOKED' // sold — never stolen
  | 'SEAT_STATE_CHANGED' // moved to HELD/BOOKED between the read and the write
  | 'NOT_BLOCKED'; // unblock of a seat that carries no maintenance block

/** One skipped seat of an admin block/unblock. */
export interface AdminSeatSkipItem {
  seatNumber: string;
  code: AdminSeatSkipCode;
  message: string;
}

/** `data` payload of `POST /api/v1/seats/admin/block`. */
export interface AdminSeatBlockResult {
  blocked: string[];
  skipped: AdminSeatSkipItem[];
}

/** `data` payload of `POST /api/v1/seats/admin/unblock`. */
export interface AdminSeatUnblockResult {
  unblocked: string[];
  skipped: AdminSeatSkipItem[];
}
