export const config = {
  // Service configuration
  service: {
    name: 'booking-service',
    port: parseInt(process.env.BOOKING_SERVICE_PORT || '3003', 10),
    env: process.env.NODE_ENV || 'development',
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/vexeviet',
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    keyPrefix: 'vexeviet:booking:',
  },

  // RabbitMQ configuration
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    exchanges: {
      booking: 'booking.events',
    },
    queues: {
      bookingCreated: 'booking.created',
      bookingConfirmed: 'booking.confirmed',
      bookingCancelled: 'booking.cancelled',
      seatReserved: 'seat.reserved',
      seatReleased: 'seat.released',
    },
  },

  // Booking configuration
  booking: {
    // Booking code format: VXV + 7 alphanumeric characters
    codePrefix: 'VXV',
    codeLength: 10,
    
    // Seat hold TTL in seconds (15 minutes)
    seatHoldTTL: 900,
    
    // Payment deadline in minutes
    paymentDeadlineMinutes: 15,
    
    // Maximum seats per booking
    maxSeatsPerBooking: 10,
    
    // Service fee percentage
    serviceFeePercent: 5,
    
    // Idempotency key TTL in seconds (24 hours)
    idempotencyKeyTTL: 86400,
  },

  // Pagination defaults
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },
};

export default config;
