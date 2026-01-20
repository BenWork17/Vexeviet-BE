import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TokenPayload, UserRole } from '../types';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

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
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

export const operatorMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }

  if (req.user.role !== UserRole.OPERATOR && req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: Operator or Admin role required',
    });
    return;
  }

  next();
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }

  if (req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: Admin role required',
    });
    return;
  }

  next();
};
