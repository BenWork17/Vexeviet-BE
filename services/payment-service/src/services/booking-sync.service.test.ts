import assert from 'node:assert/strict';
import test from 'node:test';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { toApiV1Url } from '@vexeviet/config';
import { paymentConfig } from '../config';
import { resolveBookingSyncTarget } from './booking-sync.service';

test('paymentConfig.bookingService.baseUrl always ends with /api/v1 even when BOOKING_SERVICE_URL is an origin', () => {
  assert.equal(toApiV1Url('http://localhost:3003'), 'http://localhost:3003/api/v1');
  assert.equal(toApiV1Url('http://localhost:3003/'), 'http://localhost:3003/api/v1');
  assert.equal(toApiV1Url('http://localhost:3003/api/v1'), 'http://localhost:3003/api/v1');
  assert.match(paymentConfig.bookingService.baseUrl, /\/api\/v1$/);
});

test('resolveBookingSyncTarget maps payment statuses accurately', () => {
  assert.deepEqual(resolveBookingSyncTarget(PaymentStatus.COMPLETED), {
    action: 'CONFIRM',
    bookingStatus: BookingStatus.CONFIRMED,
    pathSuffix: 'confirm',
  });
  assert.deepEqual(resolveBookingSyncTarget(PaymentStatus.FAILED), {
    action: 'PAYMENT_FAILED',
    bookingStatus: BookingStatus.CANCELLED,
    pathSuffix: 'payment-failed',
  });
  assert.equal(resolveBookingSyncTarget(PaymentStatus.PENDING), null);
  assert.equal(resolveBookingSyncTarget(PaymentStatus.REFUNDED), null);
});
