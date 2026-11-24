import { BookingStatus, PaymentStatus } from '@prisma/client';
import { internalFetch } from '@vexeviet/common';
import { paymentConfig } from '../config';
import { BookingSyncAction } from '../types';

const isTerminalFailureStatus = (status: PaymentStatus): boolean =>
  status === PaymentStatus.FAILED ||
  status === PaymentStatus.CANCELLED ||
  status === PaymentStatus.EXPIRED;

export interface BookingSyncTarget {
  action: BookingSyncAction;
  bookingStatus: BookingStatus;
  pathSuffix: 'confirm' | 'payment-failed';
}

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

export class BookingSyncUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookingSyncUnavailableError';
  }
}

export class BookingSyncService {
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
    const body = target.action === 'PAYMENT_FAILED' && reason ? { reason } : undefined;

    let response: Response;

    try {
      response = await internalFetch(endpoint, {
        method: 'POST',
        headers: paymentConfig.bookingService.internalApiKey
          ? { 'x-internal-api-key': paymentConfig.bookingService.internalApiKey }
          : undefined,
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
