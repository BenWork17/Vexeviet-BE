import { InitiatePaymentRequest, InitiatePaymentResponse } from './types';

/**
 * Mock Payment API for development testing
 * Simulates payment gateway integration without real payment processing
 */
export async function mockInitiatePayment(
  request: InitiatePaymentRequest
): Promise<InitiatePaymentResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Generate mock transaction ID
  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Create mock payment URL pointing to local mock gateway
  const mockPaymentUrl = new URL('/mock-gateway', window.location.origin);
  mockPaymentUrl.searchParams.set('bookingId', request.bookingId);
  mockPaymentUrl.searchParams.set('amount', request.amount.toString());
  mockPaymentUrl.searchParams.set('method', request.paymentMethod);
  mockPaymentUrl.searchParams.set('transactionId', transactionId);

  return {
    success: true,
    paymentUrl: mockPaymentUrl.toString(),
    transactionId,
  };
}
