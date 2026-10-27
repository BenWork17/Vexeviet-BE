import { PaymentStatus } from '@prisma/client';
import { paymentConfig } from '../config';

const isTerminalFailureStatus = (status: PaymentStatus): boolean =>
  status === PaymentStatus.FAILED ||
  status === PaymentStatus.CANCELLED ||
  status === PaymentStatus.EXPIRED;

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
    let endpointPath: string | null = null;
    let body: Record<string, string> | undefined;

    if (paymentStatus === PaymentStatus.COMPLETED) {
      endpointPath = `/bookings/${bookingId}/confirm`;
    } else if (isTerminalFailureStatus(paymentStatus)) {
      endpointPath = `/bookings/${bookingId}/payment-failed`;
      body = reason ? { reason } : undefined;
    }

    if (!endpointPath) {
      return;
    }

    const endpoint = `${paymentConfig.bookingService.baseUrl}${endpointPath}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to sync booking status. endpoint=${endpoint}, status=${response.status}, body=${errorBody}`
      );
    }
  }
}

export const bookingSyncService = new BookingSyncService();
