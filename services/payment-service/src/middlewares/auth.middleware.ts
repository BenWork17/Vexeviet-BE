import type { Request, Response } from 'express';
import {
  authMiddleware,
  optionalAuth,
  adminOnly,
  operatorOrAdmin,
} from '@vexeviet/common';
import type { TokenPayload } from '../types';

export interface AuthRequest extends Request {
  user?: TokenPayload;
  requestId?: string;
}

export { authMiddleware, optionalAuth, adminOnly, operatorOrAdmin };

export interface BookingOwnership {
  userId: string;
  operatorId: string;
}

export const canAccessBooking = (
  user: TokenPayload,
  booking: BookingOwnership
): boolean => {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'OPERATOR') return booking.operatorId === user.userId;
  return booking.userId === user.userId;
};

export const sendForbidden = (res: Response): void => {
  res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Forbidden',
    },
  });
};
