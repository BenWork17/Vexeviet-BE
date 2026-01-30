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
    maxRequests: 1000,
    windowMs: 60000, // 1 minute
    message: 'Too many registration attempts.',
  },
  '/api/v1/auth/login': {
    maxRequests: 1000,
    windowMs: 60000, // 1 minute
    message: 'Too many login attempts.',
  },
  '/api/v1/auth/verify-otp': {
    maxRequests: 1000,
    windowMs: 60000, // 1 minute
    message: 'Too many verification attempts.',
  },
  '/api/v1/auth/resend-otp': {
    maxRequests: 1000,
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
