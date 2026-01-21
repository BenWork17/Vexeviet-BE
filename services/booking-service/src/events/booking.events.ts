import {
  BookingCreatedEvent,
  BookingConfirmedEvent,
  BookingCancelledEvent,
  SeatReservedEvent,
  SeatReleasedEvent,
} from '../types';
import { eventPublisher } from './publisher';

/**
 * Booking Events - Published when booking state changes
 */
export const BookingEvents = {
  /**
   * Publish when a new booking is created
   */
  async publishBookingCreated(event: BookingCreatedEvent): Promise<boolean> {
    return eventPublisher.publish('booking.created', {
      type: 'BOOKING_CREATED',
      ...event,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Publish when a booking is confirmed (payment received)
   */
  async publishBookingConfirmed(event: BookingConfirmedEvent): Promise<boolean> {
    return eventPublisher.publish('booking.confirmed', {
      type: 'BOOKING_CONFIRMED',
      ...event,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Publish when a booking is cancelled
   */
  async publishBookingCancelled(event: BookingCancelledEvent): Promise<boolean> {
    return eventPublisher.publish('booking.cancelled', {
      type: 'BOOKING_CANCELLED',
      ...event,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Seat Events - Published when seat availability changes
 */
export const SeatEvents = {
  /**
   * Publish when seats are reserved for a booking
   */
  async publishSeatReserved(event: SeatReservedEvent): Promise<boolean> {
    return eventPublisher.publish('seat.reserved', {
      type: 'SEAT_RESERVED',
      ...event,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Publish when seats are released (booking cancelled or expired)
   */
  async publishSeatReleased(event: SeatReleasedEvent): Promise<boolean> {
    return eventPublisher.publish('seat.released', {
      type: 'SEAT_RELEASED',
      ...event,
      timestamp: new Date().toISOString(),
    });
  },
};

// Export types for consumers
export type {
  BookingCreatedEvent,
  BookingConfirmedEvent,
  BookingCancelledEvent,
  SeatReservedEvent,
  SeatReleasedEvent,
};
