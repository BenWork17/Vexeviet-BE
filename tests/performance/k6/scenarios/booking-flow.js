import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { BASE_URL, bookingFlowOptions, headers, authHeaders, randomEmail, randomPhone, thinkTime } from '../config.js';

export const options = bookingFlowOptions;

const bookingDuration = new Trend('booking_duration');
const seatAvailabilityDuration = new Trend('seat_availability_duration');
const holdSeatDuration = new Trend('hold_seat_duration');
const createBookingDuration = new Trend('create_booking_duration');
const bookingErrors = new Rate('booking_errors');
const concurrencyErrors = new Rate('concurrency_errors');
const successfulBookings = new Counter('successful_bookings');
const failedBookings = new Counter('failed_bookings');

export function setup() {
  const email = randomEmail();
  const password = 'TestPass123!';

  const registerRes = http.post(
    `${BASE_URL}/api/v1/users/register`,
    JSON.stringify({
      email,
      phone: randomPhone(),
      password,
      fullName: 'Booking Test User',
    }),
    { headers }
  );

  const loginRes = http.post(
    `${BASE_URL}/api/v1/users/login`,
    JSON.stringify({ email, password }),
    { headers }
  );

  let accessToken = null;
  try {
    const body = JSON.parse(loginRes.body);
    accessToken = body.data?.accessToken;
  } catch {
    // ignore
  }

  const routesRes = http.get(`${BASE_URL}/api/v1/routes`, { headers });
  let routes = [];
  try {
    const body = JSON.parse(routesRes.body);
    routes = body.data?.routes || body.data || [];
  } catch {
    // ignore
  }

  return { accessToken, routes };
}

export default function (data) {
  const { accessToken, routes } = data;

  if (!accessToken || routes.length === 0) {
    console.log('Setup failed, skipping iteration');
    return;
  }

  const route = routes[Math.floor(Math.random() * routes.length)];
  const departureDate = new Date();
  departureDate.setDate(departureDate.getDate() + Math.floor(Math.random() * 7) + 1);
  const departureDateStr = departureDate.toISOString().split('T')[0];

  let availableSeats = [];
  let holdId = null;

  group('Check Seat Availability', () => {
    const url = `${BASE_URL}/api/v1/bookings/seats/availability?routeId=${route.id}&departureDate=${departureDateStr}`;

    const res = http.get(url, { headers: authHeaders(accessToken) });

    const success = check(res, {
      'availability status is 200': (r) => r.status === 200,
      'availability response time < 300ms': (r) => r.timings.duration < 300,
      'returns seat data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data?.seats !== undefined || body.data !== undefined;
        } catch {
          return false;
        }
      },
    });

    seatAvailabilityDuration.add(res.timings.duration);
    bookingErrors.add(!success);

    if (success) {
      try {
        const body = JSON.parse(res.body);
        const seats = body.data?.seats || body.data || [];
        availableSeats = seats.filter((s) => s.status === 'AVAILABLE').slice(0, 2);
      } catch {
        // ignore
      }
    }
  });

  thinkTime(0.5, 1);

  if (availableSeats.length > 0) {
    group('Hold Seats', () => {
      const payload = JSON.stringify({
        routeId: route.id,
        departureDate: departureDateStr,
        seatIds: availableSeats.map((s) => s.id || s.seatId),
      });

      const res = http.post(`${BASE_URL}/api/v1/bookings/seats/hold`, payload, {
        headers: authHeaders(accessToken),
      });

      const success = check(res, {
        'hold status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'hold response time < 500ms': (r) => r.timings.duration < 500,
      });

      holdSeatDuration.add(res.timings.duration);

      if (res.status === 409) {
        concurrencyErrors.add(1);
        console.log('Concurrency conflict: seats already held');
      } else {
        bookingErrors.add(!success);
      }

      if (success) {
        try {
          const body = JSON.parse(res.body);
          holdId = body.data?.holdId || body.data?.id;
        } catch {
          // ignore
        }
      }
    });
  }

  thinkTime(1, 2);

  if (holdId || availableSeats.length > 0) {
    group('Create Booking', () => {
      const payload = JSON.stringify({
        routeId: route.id,
        departureDate: departureDateStr,
        seatIds: availableSeats.map((s) => s.id || s.seatId),
        holdId,
        passengers: availableSeats.map((_, i) => ({
          fullName: `Passenger ${i + 1}`,
          phone: randomPhone(),
          email: randomEmail(),
        })),
        contactInfo: {
          fullName: 'Contact Person',
          phone: randomPhone(),
          email: randomEmail(),
        },
      });

      const res = http.post(`${BASE_URL}/api/v1/bookings`, payload, {
        headers: authHeaders(accessToken),
      });

      const success = check(res, {
        'booking status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'booking response time < 500ms': (r) => r.timings.duration < 500,
        'booking returns confirmation': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.data?.id || body.data?.bookingId;
          } catch {
            return false;
          }
        },
      });

      createBookingDuration.add(res.timings.duration);
      bookingDuration.add(res.timings.duration);

      if (res.status === 409) {
        concurrencyErrors.add(1);
        failedBookings.add(1);
      } else if (success) {
        successfulBookings.add(1);
      } else {
        bookingErrors.add(1);
        failedBookings.add(1);
      }
    });
  }

  thinkTime(0.5, 1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'reports/booking-flow-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const { metrics } = data;
  return `
=== Booking Flow Performance Summary ===

Booking Results:
  Successful: ${metrics.successful_bookings?.values?.count || 0}
  Failed: ${metrics.failed_bookings?.values?.count || 0}
  Concurrency Conflicts: ${((metrics.concurrency_errors?.values?.rate || 0) * 100).toFixed(2)}%

Response Times:
  Seat Availability:
    Avg: ${(metrics.seat_availability_duration?.values?.avg || 0).toFixed(2)}ms
    P95: ${(metrics.seat_availability_duration?.values?.['p(95)'] || 0).toFixed(2)}ms

  Hold Seats:
    Avg: ${(metrics.hold_seat_duration?.values?.avg || 0).toFixed(2)}ms
    P95: ${(metrics.hold_seat_duration?.values?.['p(95)'] || 0).toFixed(2)}ms

  Create Booking:
    Avg: ${(metrics.create_booking_duration?.values?.avg || 0).toFixed(2)}ms
    P95: ${(metrics.create_booking_duration?.values?.['p(95)'] || 0).toFixed(2)}ms

Overall:
  Error Rate: ${((metrics.booking_errors?.values?.rate || 0) * 100).toFixed(2)}%
  P95 Response: ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms (Target: <500ms)
`;
}
