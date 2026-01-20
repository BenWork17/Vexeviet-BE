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

// Endpoint-specific rate limit configurations
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  '/api/v1/auth/register': {
    maxRequests: 5,
    windowMs: 3600000, // 1 hour
    message: 'Too many registration attempts. Try again in 1 hour.',
  },
  '/api/v1/auth/login': {
    maxRequests: 10,
    windowMs: 900000, // 15 minutes
    message: 'Too many login attempts. Try again in 15 minutes.',
  },
  '/api/v1/auth/verify-otp': {
    maxRequests: 5,
    windowMs: 600000, // 10 minutes
    message: 'Too many verification attempts. Request a new code.',
  },
  '/api/v1/auth/resend-otp': {
    maxRequests: 3,
    windowMs: 3600000, // 1 hour
    message: 'Too many OTP requests. Try again in 1 hour.',
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
