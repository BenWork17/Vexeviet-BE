/**
 * VeXeViet API Types for Frontend Integration
 * Version: Iteration 1-4 (Booking Service)
 * Last Updated: 2026-01-19
 */

// ========================
// Common Types
// ========================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ========================
// User & Auth Types
// ========================

export type UserRole = 'CUSTOMER' | 'OPERATOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DELETED';

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

// Auth - Register
export interface RegisterRequest {
  method: 'email' | 'phone';
  email?: string;        // Required if method = 'email'
  phone?: string;        // Required if method = 'phone'
  password: string;      // Min 8 chars, must have uppercase, number
  firstName: string;
  lastName: string;
  agreeToTerms: boolean; // Must be true
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  verificationRequired: boolean;
  verificationMethod: 'email' | 'phone';
}

// Auth - Login
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>;
  accessToken: string;
  refreshToken: string;
}

// Auth - Refresh Token
export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// User - Update Profile
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

// ========================
// Route Types
// ========================

export type RouteStatus = 'ACTIVE' | 'INACTIVE' | 'CANCELLED';
export type VehicleType = 'LIMOUSINE' | 'SLEEPER_BUS' | 'STANDARD' | 'VIP';

export interface Route {
  id: string;
  operatorId: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;      // HH:mm format
  arrivalTime: string;        // HH:mm format
  duration: number;           // minutes
  price: number;
  availableSeats: number;
  totalSeats: number;
  vehicleType: VehicleType;
  amenities: string[];
  status: RouteStatus;
  departureCitySlug: string;
  arrivalCitySlug: string;
  pickupPoints: PickupPoint[];
  dropoffPoints: DropoffPoint[];
  operator?: Operator;
}

export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  time: string;              // HH:mm format
  latitude?: number;
  longitude?: number;
}

export interface DropoffPoint {
  id: string;
  name: string;
  address: string;
  time: string;              // HH:mm format
  latitude?: number;
  longitude?: number;
}

export interface Operator {
  id: string;
  name: string;
  rating?: number;
  totalTrips?: number;
}

// Route Search
export interface SearchRoutesParams {
  from: string;              // City slug, e.g., "ho-chi-minh"
  to: string;                // City slug, e.g., "da-lat"
  date: string;              // YYYY-MM-DD format
  passengers?: number;       // Default: 1
  page?: number;             // Default: 1
  limit?: number;            // Default: 10
  sortBy?: 'price' | 'departureTime' | 'rating';
  sortOrder?: 'asc' | 'desc';
  vehicleType?: VehicleType;
  minPrice?: number;
  maxPrice?: number;
  departureTimeFrom?: string; // HH:mm
  departureTimeTo?: string;   // HH:mm
  amenities?: string[];
}

// ========================
// Booking Types
// ========================

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

export interface Booking {
  id: string;
  bookingCode: string;       // e.g., "VXV7A8B9C0"
  userId: string;
  routeId: string;
  departureDate: string;     // YYYY-MM-DD
  status: BookingStatus;
  totalAmount: number;
  passengers: Passenger[];
  seats: string[];           // e.g., ["A1", "A2"]
  pickupPointId: string;
  dropoffPointId: string;
  contactInfo: ContactInfo;
  paymentDeadline: string;   // ISO datetime
  createdAt: string;
  updatedAt: string;
  route?: Route;
}

export interface Passenger {
  firstName: string;
  lastName: string;
  seatNumber: string;        // e.g., "A1"
  idNumber?: string;         // Optional ID card number
  phone?: string;
}

export interface ContactInfo {
  email: string;
  phone: string;             // E.164 format, e.g., "+84901234567"
  fullName?: string;
}

// Booking - Create
export interface CreateBookingRequest {
  routeId: string;
  departureDate: string;     // YYYY-MM-DD
  passengers: Passenger[];
  seats: string[];           // Must match passenger count
  pickupPointId: string;
  dropoffPointId: string;
  contactInfo: ContactInfo;
  idempotencyKey: string;    // UUID - prevent duplicate bookings
  notes?: string;
}

export interface CreateBookingResponse {
  bookingId: string;
  bookingCode: string;
  status: BookingStatus;
  totalAmount: number;
  paymentDeadline: string;
  expiresInSeconds: number;
}

// Booking - Cancel
export interface CancelBookingRequest {
  reason?: string;
}

export interface CancelBookingResponse {
  bookingId: string;
  status: 'CANCELLED';
  cancelledAt: string;
  refundAmount?: number;
  refundStatus?: string;
}

// ========================
// Seat Types
// ========================

export interface SeatInfo {
  seatNumber: string;        // e.g., "A1"
  status: SeatStatus;
  price: number;
  floor?: number;            // For sleeper buses: 1 or 2
  row?: number;
  column?: string;           // A, B, C...
}

export interface SeatAvailability {
  routeId: string;
  departureDate: string;
  totalSeats: number;
  availableSeats: number;
  seats: SeatInfo[];
  seatMap?: SeatMapConfig;
}

export interface SeatMapConfig {
  rows: number;
  columns: number;
  floors: number;
  layout: string[][];        // 2D array of seat positions
}

// Seat - Check Availability
export interface CheckSeatsRequest {
  routeId: string;
  departureDate: string;     // YYYY-MM-DD
  seats: string[];           // Seat numbers to check
}

export interface CheckSeatsResponse {
  available: boolean;
  unavailableSeats: string[];
  seats: Array<{
    seatNumber: string;
    status: SeatStatus;
    heldBy?: string;         // If held, who holds it
    heldUntil?: string;      // If held, when it expires
  }>;
}

// Seat - Hold
export interface HoldSeatsRequest {
  routeId: string;
  departureDate: string;
  seats: string[];
  ttlSeconds?: number;       // Default: 900 (15 minutes)
}

export interface HoldSeatsResponse {
  holdId: string;
  seats: string[];
  expiresAt: string;
  ttlSeconds: number;
}

// Seat - Release
export interface ReleaseSeatsRequest {
  routeId: string;
  departureDate: string;
  seats: string[];
  holdId?: string;
}

// ========================
// Error Codes
// ========================

export type ErrorCode =
  // Auth errors
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'UNAUTHORIZED'
  // Validation errors
  | 'VALIDATION_ERROR'
  | 'INVALID_INPUT'
  // Resource errors
  | 'NOT_FOUND'
  | 'ROUTE_NOT_FOUND'
  | 'BOOKING_NOT_FOUND'
  // Booking errors
  | 'SEATS_UNAVAILABLE'
  | 'SEATS_ALREADY_HELD'
  | 'BOOKING_EXPIRED'
  | 'BOOKING_ALREADY_CANCELLED'
  | 'INSUFFICIENT_SEATS'
  | 'INVALID_SEAT_NUMBERS'
  | 'PASSENGER_SEAT_MISMATCH'
  // System errors
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

// ========================
// Constants
// ========================

export const BOOKING_HOLD_DURATION_SECONDS = 900; // 15 minutes
export const BOOKING_PAYMENT_DEADLINE_MINUTES = 15;

export const VEHICLE_TYPES: VehicleType[] = ['LIMOUSINE', 'SLEEPER_BUS', 'STANDARD', 'VIP'];

export const BOOKING_STATUSES: BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'EXPIRED',
];

// ========================
// API Endpoints Reference
// ========================

export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: '/api/v1/auth/register',
  AUTH_LOGIN: '/api/v1/auth/login',
  AUTH_LOGOUT: '/api/v1/auth/logout',
  AUTH_REFRESH: '/api/v1/auth/refresh-token',

  // Users
  USER_PROFILE: '/api/v1/users/profile',

  // Routes
  ROUTES_SEARCH: '/api/v1/routes/search',
  ROUTES_BY_ID: (id: string) => `/api/v1/routes/${id}`,
  ROUTES_POPULAR: '/api/v1/routes/popular',
  CITIES: '/api/v1/cities',

  // Bookings
  BOOKINGS_CREATE: '/api/v1/bookings',
  BOOKINGS_MY: '/api/v1/bookings/my',
  BOOKINGS_BY_ID: (id: string) => `/api/v1/bookings/${id}`,
  BOOKINGS_CANCEL: (id: string) => `/api/v1/bookings/${id}/cancel`,

  // Seats
  SEATS_AVAILABILITY: '/api/v1/seats/availability',
  SEATS_CHECK: '/api/v1/seats/check',
  SEATS_HOLD: '/api/v1/seats/hold',
  SEATS_RELEASE: '/api/v1/seats/release',
} as const;
