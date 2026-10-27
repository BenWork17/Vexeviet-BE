import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { TokenPayload, UserRole } from '../types';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

const authService = new AuthService();

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);
    const payload = authService.verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

/**
 * Restrict a route to ADMIN tokens. Must run after `authMiddleware`, which is
 * what populates `req.user`.
 */
export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'No token provided',
    });
    return;
  }

  if (req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }

  next();
};

/**
 * Restrict a route to OPERATOR or ADMIN tokens. Must run after `authMiddleware`.
 */
export const operatorOrAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'No token provided',
    });
    return;
  }

  if (req.user.role !== UserRole.OPERATOR && req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      error: 'Operator or admin access required',
    });
    return;
  }

  next();
};
