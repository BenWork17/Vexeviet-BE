import { Request, Response, NextFunction } from 'express';

export interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

// Endpoint-specific rate limit configurations.
//
// 1000 requests/minute is ≈16.7 req/s per IP — not a limit against a credential
// endpoint, so each ceiling is now sized to the abuse that endpoint actually permits:
//
// - register     5/min  — an accepted call creates an account AND sends a paid
//                         email/SMS OTP. One person registers once, so 5/min still
//                         absorbs several signups from a shared cafe/carrier NAT.
// - login       10/min  — the credential-stuffing target. A user who mistypes a
//                         password needs 2-3 attempts, so 10 keeps headroom while
//                         cutting the old 1000/min spray by two orders of magnitude.
// - verify-otp  10/min  — the code is 6 digits (1e6) and lives 10 minutes with no
//                         per-code attempt counter, so this window bounds one IP to
//                         ~100 guesses per code lifetime instead of 10,000.
// - resend-otp   3/min  — every call sends an email/SMS and costs money. A user who
//                         never received the first code needs one or two resends.
//
// All four keep a 60s window so `retryAfter` stays predictable and a single typo is
// never a lockout — the counter simply resets a minute later.
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  '/api/v1/auth/register': {
    maxRequests: 5,
    windowMs: 60000, // 1 minute
    message: 'Too many registration attempts.',
  },
  '/api/v1/auth/login': {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    message: 'Too many login attempts.',
  },
  '/api/v1/auth/verify-otp': {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    message: 'Too many verification attempts.',
  },
  '/api/v1/auth/resend-otp': {
    maxRequests: 3,
    windowMs: 60000, // 1 minute
    message: 'Too many OTP requests.',
  },
};

export const rateLimiter = (
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    // Check for endpoint-specific rate limit
    const endpointConfig = rateLimitConfigs[req.path];
    const limit = endpointConfig?.maxRequests || maxRequests;
    const window = endpointConfig?.windowMs || windowMs;
    const message = endpointConfig?.message || 'Too many requests, please try again later.';

    const storeKey = endpointConfig ? `${key}:${req.path}` : key;

    // Clean up expired entries
    if (store[storeKey] && store[storeKey].resetTime < now) {
      delete store[storeKey];
    }

    // Initialize or increment counter
    if (!store[storeKey]) {
      store[storeKey] = {
        count: 1,
        resetTime: now + window,
      };
      next();
      return;
    }

    store[storeKey].count++;

    if (store[storeKey].count > limit) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter: Math.ceil((store[storeKey].resetTime - now) / 1000),
        },
      });
      return;
    }

    next();
  };
};
