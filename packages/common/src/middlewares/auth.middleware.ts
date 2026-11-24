import { timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@vexeviet/config';
import { INTERNAL_API_KEY_HEADER } from '../constants';
import {
  ForbiddenError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../errors/app-error';
import type { SharedAuthRequest, SharedTokenPayload, SharedUserRole } from '../types';

export function verifyAccessToken(token: string, secret = config.jwt.secret): SharedTokenPayload {
  return jwt.verify(token, secret) as SharedTokenPayload;
}

export const authMiddleware = (
  req: SharedAuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next(new UnauthorizedError('No token provided'));
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      next(new UnauthorizedError('No token provided'));
      return;
    }

    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
      return;
    }
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const optionalAuth = (
  req: SharedAuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token) {
      try {
        req.user = verifyAccessToken(token);
      } catch {
        // Ignore invalid/expired token for optional auth endpoints
      }
    }
  }
  next();
};

export const authorizeRoles = (...allowedRoles: SharedUserRole[]) => {
  return (req: SharedAuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError(`Access restricted to: ${allowedRoles.join(', ')}`));
      return;
    }

    next();
  };
};

export const adminOnly = authorizeRoles('ADMIN');
export const operatorOrAdmin = authorizeRoles('OPERATOR', 'ADMIN');
export const customerOnly = authorizeRoles('CUSTOMER');

// Aliases used by route-service
export const adminMiddleware = adminOnly;
export const operatorMiddleware = operatorOrAdmin;

const safeEqual = (provided: string, expected: string): boolean => {
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(providedBuf, expectedBuf);
};

/**
 * Constant-time internal service-to-service API key guard (fail-closed when unset).
 */
export const internalKeyMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const expected = process.env.BOOKING_SERVICE_INTERNAL_API_KEY || config.services.internalApiKey;

  if (!expected) {
    next(
      new ServiceUnavailableError(
        'Internal endpoints are disabled: BOOKING_SERVICE_INTERNAL_API_KEY is not configured.',
        'INTERNAL_API_KEY_NOT_CONFIGURED'
      )
    );
    return;
  }

  const rawHeader = req.headers[INTERNAL_API_KEY_HEADER];
  const provided = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (!provided || !safeEqual(provided, expected)) {
    next(new UnauthorizedError('Invalid or missing internal API key'));
    return;
  }

  next();
};
