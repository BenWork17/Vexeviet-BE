import { BookingStatus, writeAuditLog } from '@vexeviet/database';
import { BookingRepository } from '../repositories/booking.repository';
import { SeatRepository } from '../repositories/seat.repository';
import { BookingDetailResponse } from '../types';
import {
  BookingExpiredError,
  ConflictError,
  NotFoundError,
} from '../middlewares/error.middleware';
import { formatBookingDetailResponse } from './booking-formatters';

export class BookingInternalService {
  private bookingRepo: BookingRepository;
  private seatRepo: SeatRepository;

  constructor(
    bookingRepo = new BookingRepository(),
    seatRepo = new SeatRepository()
  ) {
    this.bookingRepo = bookingRepo;
    this.seatRepo = seatRepo;
  }

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

    return formatBookingDetailResponse(updatedBooking);
  }

  async markPaymentFailed(
    bookingId: string,
    reason?: string
  ): Promise<BookingDetailResponse> {
    const booking = await this.bookingRepo.findById(bookingId);

    if (!booking) {
      throw new NotFoundError('Booking', bookingId);
    }

    if (
      booking.status === BookingStatus.CONFIRMED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new ConflictError(
        `Cannot mark payment failed for booking with status: ${booking.status}`
      );
    }

    const updatedBooking = await this.bookingRepo.updateStatus(
      bookingId,
      BookingStatus.CANCELLED,
      {
        cancelledAt: new Date(),
        cancellationReason: reason || 'Payment failed',
      }
    );

    await this.seatRepo.releaseSeatsByBookingId(bookingId);

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

    return formatBookingDetailResponse(updatedBooking);
  }
}
