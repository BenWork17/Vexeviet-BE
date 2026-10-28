import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenPayload } from '../types';

/**
 * JWT secret. Mirrors booking-service so a token minted by user-service verifies here.
 * (payment-service has no `config.jwt` block; this reads the same `JWT_SECRET` env var.)
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

const unauthorized = (res: Response): void => {
  res.status(401).json({
    success: false,
    error: 'Unauthorized',
    code: 'UNAUTHORIZED',
  });
};

const forbidden = (res: Response): void => {
  res.status(403).json({
    success: false,
    error: 'Forbidden',
    code: 'FORBIDDEN',
  });
};

/**
 * Verify `Authorization: Bearer <jwt>` and attach the payload to `req.user`.
 * Responds inline (flat string + sibling `code`) — payment-service has no error classes.
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    unauthorized(res);
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    unauthorized(res);
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as TokenPayload;
    req.user = decoded;
    next();
  } catch {
    unauthorized(res);
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    unauthorized(res);
    return;
  }

  if (req.user.role !== 'ADMIN') {
    forbidden(res);
    return;
  }

  next();
};

export const operatorOrAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    unauthorized(res);
    return;
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERATOR') {
    forbidden(res);
    return;
  }

  next();
};

/** Ownership of the booking a payment belongs to. */
export interface BookingOwnership {
  userId: string;
  operatorId: string;
}

/**
 * Owner-or-admin rule shared by every payment read/cancel route:
 * - ADMIN: always allowed.
 * - OPERATOR: allowed when the booking's route belongs to them.
 * - CUSTOMER: allowed when the booking's `userId` matches the token.
 */
export const canAccessBooking = (
  user: TokenPayload,
  booking: BookingOwnership
): boolean => {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'OPERATOR') return booking.operatorId === user.userId;
  return booking.userId === user.userId;
};

export const sendForbidden = forbidden;
