import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bookingQuerySchema,
  cancelBookingSchema,
  createBookingSchema,
  holdSeatsSchema,
  seatAvailabilitySchema,
} from './booking.validator';

const VALID_ROUTE_ID = '550e8400-e29b-41d4-a716-446655440000';

test('createBookingSchema accepts valid booking payload and rejects malformed inputs', () => {
  const valid = createBookingSchema.safeParse({
    routeId: VALID_ROUTE_ID,
    departureDate: '2026-12-10',
    passengers: [{ firstName: 'Minh', lastName: 'Nguyễn', seatNumber: 'A01' }],
    seats: ['A01'],
    pickupPointId: 'pu-1',
    dropoffPointId: 'do-1',
    contactInfo: { email: 'minh@example.com', phone: '0901234567' },
    idempotencyKey: 'idem-001',
  });
  assert.equal(valid.success, true);

  const missingSeats = createBookingSchema.safeParse({
    routeId: 'not-a-uuid',
    departureDate: 'invalid-date',
    passengers: [],
    seats: [],
    pickupPointId: '',
    dropoffPointId: '',
    contactInfo: { email: 'bad-email', phone: '123' },
    idempotencyKey: '',
  });
  assert.equal(missingSeats.success, false);
});

test('holdSeatsSchema, seatAvailabilitySchema, cancelBookingSchema, and bookingQuerySchema validate strictly', () => {
  assert.equal(
    holdSeatsSchema.safeParse({
      routeId: VALID_ROUTE_ID,
      departureDate: '2026-12-10T08:00:00Z',
      seats: ['A01', 'A02'],
      ttlSeconds: 900,
    }).success,
    true,
  );

  assert.equal(
    holdSeatsSchema.safeParse({
      routeId: VALID_ROUTE_ID,
      departureDate: '2026-12-10',
      seats: [],
    }).success,
    false,
  );

  assert.equal(
    seatAvailabilitySchema.safeParse({
      routeId: VALID_ROUTE_ID,
      departureDate: '2026-12-10',
    }).success,
    true,
  );

  assert.deepEqual(cancelBookingSchema.parse(undefined), {});

  const parsedQuery = bookingQuerySchema.parse({
    status: 'CONFIRMED',
    page: '2',
    limit: '20',
  });
  assert.equal(parsedQuery.page, 2);
  assert.equal(parsedQuery.limit, 20);
});
