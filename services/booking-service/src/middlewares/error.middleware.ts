import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  GoneError,
  createErrorHandler,
  notFoundHandler,
} from '@vexeviet/common';

export {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  notFoundHandler,
};

export const errorHandler = createErrorHandler('booking-service');

export class SeatsUnavailableError extends ConflictError {
  constructor(seats: string[]) {
    super(`Seats are no longer available: ${seats.join(', ')}`, 'SEATS_UNAVAILABLE', {
      unavailableSeats: seats,
    });
  }
}

export class BookingExpiredError extends GoneError {
  constructor(bookingCode: string) {
    super(`Booking '${bookingCode}' has expired`, 'BOOKING_EXPIRED');
  }
}

export class IdempotencyError extends ConflictError {
  constructor(key: string) {
    super(
      `Request with idempotency key '${key}' is already being processed`,
      'IDEMPOTENCY_CONFLICT'
    );
  }
}

export class BookingNotFoundError extends AppError {
  constructor(bookingId?: string) {
    super(
      bookingId ? `Booking '${bookingId}' not found` : 'Booking not found',
      404,
      'BOOKING_NOT_FOUND'
    );
  }
}

export class TripNotCompletedError extends AppError {
  constructor(message = 'You can only review a booking after completing the trip') {
    super(message, 400, 'TRIP_NOT_COMPLETED');
  }
}

export class ReviewAlreadyExistsError extends ConflictError {
  constructor(bookingId?: string) {
    super(
      bookingId
        ? `A review already exists for booking '${bookingId}'`
        : 'A review already exists for this booking',
      'REVIEW_ALREADY_EXISTS'
    );
  }
}
