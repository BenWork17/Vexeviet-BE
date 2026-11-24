import { config as sharedConfig } from '@vexeviet/config';

export const config = {
  service: {
    name: 'booking-service',
    port: sharedConfig.ports.booking,
    env: sharedConfig.nodeEnv,
  },
  jwt: {
    secret: sharedConfig.jwt.secret,
    accessTokenExpiry: sharedConfig.jwt.accessExpiry,
    refreshTokenExpiry: sharedConfig.jwt.refreshExpiry,
  },
  database: {
    url: sharedConfig.database.url,
  },
  booking: {
    codePrefix: 'VXV',
    codeLength: 10,
    seatHoldTTL: 900,
    paymentDeadlineMinutes: 15,
    maxSeatsPerBooking: 10,
    serviceFeePercent: 5,
    idempotencyKeyTTL: 86400,
  },
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },
};

export default config;
