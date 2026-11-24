import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Load root monorepo .env if present (without overriding already-injected env vars)
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

export const toServiceOrigin = (rawUrl: string): string =>
  rawUrl.trim().replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

export const toApiV1Url = (rawUrl: string): string =>
  `${toServiceOrigin(rawUrl)}/api/v1`;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    USER_SERVICE_PORT: z.coerce.number().int().positive().default(3001),
    ROUTE_SERVICE_PORT: z.coerce.number().int().positive().default(3002),
    BOOKING_SERVICE_PORT: z.coerce.number().int().positive().default(3003),
    PAYMENT_SERVICE_PORT: z.coerce.number().int().positive().default(3004),

    DATABASE_URL: z.string().default('mysql://root:root@localhost:3306/vexeviet'),

    REDIS_URL: z.string().optional(),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    REDIS_PASSWORD: z.string().optional(),

    JWT_SECRET: z
      .string()
      .min(16, 'JWT_SECRET must be at least 16 characters')
      .default('vexeviet-dev-jwt-secret-do-not-use-in-prod'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),

    USER_SERVICE_URL: z.string().default('http://localhost:3001'),
    ROUTE_SERVICE_URL: z.string().default('http://localhost:3002'),
    BOOKING_SERVICE_URL: z.string().default('http://localhost:3003'),
    PAYMENT_SERVICE_URL: z.string().default('http://localhost:3004'),

    BOOKING_SERVICE_INTERNAL_API_KEY: z.string().default(''),
    CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:8081,http://localhost:8082'),
    DEBUG_SQL: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV === 'production') {
      if (val.JWT_SECRET === 'vexeviet-dev-jwt-secret-do-not-use-in-prod' || val.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'Production requires an explicit JWT_SECRET of at least 32 characters',
        });
      }
      if (!process.env.DATABASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: 'DATABASE_URL must be explicitly set in production',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`[@vexeviet/config] Invalid environment configuration:\n${formatted}`);
}

export const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  ports: {
    gateway: env.PORT,
    user: env.USER_SERVICE_PORT,
    route: env.ROUTE_SERVICE_PORT,
    booking: env.BOOKING_SERVICE_PORT,
    payment: env.PAYMENT_SERVICE_PORT,
  },
  services: {
    userOrigin: toServiceOrigin(env.USER_SERVICE_URL),
    routeOrigin: toServiceOrigin(env.ROUTE_SERVICE_URL),
    bookingOrigin: toServiceOrigin(env.BOOKING_SERVICE_URL),
    paymentOrigin: toServiceOrigin(env.PAYMENT_SERVICE_URL),
    bookingApiV1: toApiV1Url(env.BOOKING_SERVICE_URL),
    internalApiKey: env.BOOKING_SERVICE_INTERNAL_API_KEY,
  },
  database: {
    url: env.DATABASE_URL,
  },
  redis: {
    url: env.REDIS_URL || `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },
  corsOrigins: env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
} as const;

export type ValidatedEnv = typeof env;
