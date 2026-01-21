# Booking Service

Booking service for VeXeViet platform - Handles seat reservation, booking management, and concurrency control.

## Features

- **Seat Reservation**: Create bookings with pessimistic locking to prevent double booking
- **Seat Availability**: Check and display available seats for routes
- **Booking Management**: Create, view, cancel bookings
- **Concurrency Control**: Idempotency keys and pessimistic locking
- **Event Publishing**: RabbitMQ integration for event-driven architecture

## API Endpoints

### Bookings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/bookings` | Create a new booking | Required |
| GET | `/api/v1/bookings/my` | Get current user's bookings | Required |
| GET | `/api/v1/bookings/:id` | Get booking by ID | Required |
| GET | `/api/v1/bookings/code/:code` | Get booking by code | Optional |
| POST | `/api/v1/bookings/:id/cancel` | Cancel a booking | Required |
| POST | `/api/v1/bookings/:id/confirm` | Confirm booking (internal) | Internal |

### Seats

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/seats/availability` | Get seat availability | Public |
| POST | `/api/v1/seats/check` | Check specific seats | Public |
| POST | `/api/v1/seats/hold` | Hold seats temporarily | Required |
| POST | `/api/v1/seats/release` | Release held seats | Required |
| POST | `/api/v1/seats/validate` | Validate seat numbers | Public |

## Running Locally

```bash
# Install dependencies
pnpm install

# Start the service
pnpm dev

# The service runs on http://localhost:3003
```

## Environment Variables

```env
BOOKING_SERVICE_PORT=3003
DATABASE_URL=mysql://root:root@localhost:3306/vexeviet
REDIS_HOST=localhost
REDIS_PORT=6379
RABBITMQ_URL=amqp://localhost:5672
JWT_SECRET=your-secret-key
```

## Architecture

```
src/
├── config/           # Configuration
├── controllers/      # HTTP handlers
├── services/         # Business logic
├── repositories/     # Database operations
├── middlewares/      # Auth, error handling
├── validators/       # Request validation (Zod)
├── events/           # RabbitMQ publishers/consumers
├── types/            # TypeScript types
└── routes/           # Express routes
```

## Events Published

| Event | Routing Key | Description |
|-------|-------------|-------------|
| BookingCreated | `booking.created` | New booking created |
| BookingConfirmed | `booking.confirmed` | Booking paid & confirmed |
| BookingCancelled | `booking.cancelled` | Booking cancelled |
| SeatReserved | `seat.reserved` | Seats reserved for booking |
| SeatReleased | `seat.released` | Seats released (cancelled/expired) |

## Concurrency Handling

1. **Idempotency Keys**: Prevent duplicate bookings from repeated requests
2. **Pessimistic Locking**: Database row-level locks during seat reservation
3. **TTL-based Seat Holds**: Seats held for 15 minutes before payment deadline
4. **Automatic Expiration**: Background job to expire unpaid bookings

## Database Models

- `Booking` - Main booking record
- `BookingPassenger` - Passenger information per seat
- `BookingSeat` - Seat reservations with status tracking
