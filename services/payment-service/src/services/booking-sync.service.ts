import { BookingStatus, PaymentStatus } from '@prisma/client';
import { paymentConfig } from '../config';
import { BookingSyncAction } from '../types';

const isTerminalFailureStatus = (status: PaymentStatus): boolean =>
  status === PaymentStatus.FAILED ||
  status === PaymentStatus.CANCELLED ||
  status === PaymentStatus.EXPIRED;

/**
 * The booking transition a payment status is supposed to produce.
 *
 * This is the single source of truth for the payment→booking mapping: both the
 * automatic sync after a webhook and the admin retry endpoint resolve through
 * here, so the retry can never disagree with what the sync would have done.
 */
export interface BookingSyncTarget {
  action: BookingSyncAction;
  /** Booking status expected after a successful downstream call. */
  bookingStatus: BookingStatus;
  /** Path suffix appended to `/bookings/:bookingId`. */
  pathSuffix: 'confirm' | 'payment-failed';
}

/**
 * `null` means "this payment status carries no booking transition". That covers
 * PENDING/PROCESSING (nothing decided yet) and REFUNDED/PARTIALLY_REFUNDED
 * (a refund does not change the booking, so re-syncing one must never cancel a
 * confirmed booking).
 */
export const resolveBookingSyncTarget = (status: PaymentStatus): BookingSyncTarget | null => {
  if (status === PaymentStatus.COMPLETED) {
    return {
      action: 'CONFIRM',
      bookingStatus: BookingStatus.CONFIRMED,
      pathSuffix: 'confirm',
    };
  }

  if (isTerminalFailureStatus(status)) {
    return {
      action: 'PAYMENT_FAILED',
      bookingStatus: BookingStatus.CANCELLED,
      pathSuffix: 'payment-failed',
    };
  }

  return null;
};

/**
 * Downstream returned a non-2xx response. Carries the status code and body so a
 * caller can tell a real conflict (409 = the booking is already ahead) apart
 * from an auth/config failure (401/503) without parsing the message.
 *
 * Extends `Error` on purpose: `vnpay.service.ts` calls the sync inside a
 * `try/catch` that answers VNPay's IPN with `rspCode '99'` on any throw, so it
 * must stay throw-compatible with no edit on that side.
 */
export class BookingSyncError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'BookingSyncError';
    this.status = status;
    this.body = body;
  }
}

/**
 * The booking service could not be reached at all (DNS/connect/timeout). Also
 * an `Error` subclass, so the VNPay IPN path keeps its existing behaviour.
 */
export class BookingSyncUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingSyncUnavailableError';
  }
}

export class BookingSyncService {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (paymentConfig.bookingService.internalApiKey) {
      headers['x-internal-api-key'] = paymentConfig.bookingService.internalApiKey;
    }

    return headers;
  }

  async syncBookingStatusAfterPayment(
    bookingId: string,
    paymentStatus: PaymentStatus,
    reason?: string
  ): Promise<void> {
    const target = resolveBookingSyncTarget(paymentStatus);

    if (!target) {
      return;
    }

    const endpoint = `${paymentConfig.bookingService.baseUrl}/bookings/${bookingId}/${target.pathSuffix}`;
    // Only the failure transition carries a reason; `confirm` never has.
    const body =
      target.action === 'PAYMENT_FAILED' && reason ? { reason } : undefined;

    let response: Awaited<ReturnType<typeof fetch>>;

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      throw new BookingSyncUnavailableError(
        `Failed to reach booking service. endpoint=${endpoint}, error=${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BookingSyncError(
        `Failed to sync booking status. endpoint=${endpoint}, status=${response.status}, body=${errorBody}`,
        response.status,
        errorBody
      );
    }
  }
}

export const bookingSyncService = new BookingSyncService();
