import type { Request } from 'express';
import {
  authMiddleware,
  optionalAuth,
  adminOnly,
  operatorOrAdmin,
  adminMiddleware,
  operatorMiddleware,
} from '@vexeviet/common';
import type { TokenPayload } from '../types';

export interface AuthRequest extends Request {
  user?: TokenPayload;
  requestId?: string;
}

export {
  authMiddleware,
  optionalAuth,
  adminOnly,
  operatorOrAdmin,
  adminMiddleware,
  operatorMiddleware,
};
