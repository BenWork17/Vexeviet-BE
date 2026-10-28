import { Request, Response, NextFunction } from 'express';
import { SeatService } from '../services/seat.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SeatAvailabilityRequest, SeatHoldRequest } from '../types';
import {
  AdminSeatBlockBodyLocals,
  AdminSeatUnblockBodyLocals,
} from '../validators/admin-seat.validator';

export class SeatController {
  private seatService: SeatService;

  constructor() {
    this.seatService = new SeatService();
  }

  /**
   * Get seat availability for a route/date
   * GET /api/v1/seats/availability
   */
  getAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { routeId, departureDate } = req.query;

      if (!routeId || !departureDate) {
        res.status(400).json({
          success: false,
          error: 'routeId and departureDate are required',
        });
        return;
      }

      const request: SeatAvailabilityRequest = {
        routeId: routeId as string,
        departureDate: departureDate as string,
      };

      const availability = await this.seatService.getAvailability(request);

      res.status(200).json({
        success: true,
        data: availability,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Check if specific seats are available
   * POST /api/v1/seats/check
   */
  checkSeats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { routeId, departureDate, seats } = req.body;

      const result = await this.seatService.checkSeatsAvailable(
        routeId || '',
        departureDate || new Date().toISOString(),
        Array.isArray(seats) ? seats : []
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Hold seats temporarily
   * POST /api/v1/seats/hold
   */
  holdSeats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { routeId, departureDate, seats, ttlSeconds } = req.body;

      const request: SeatHoldRequest = {
        routeId: routeId || '',
        departureDate: departureDate || new Date().toISOString(),
        seats: Array.isArray(seats) ? seats : [],
        userId: req.user.userId,
        ttlSeconds,
      };

      const result = await this.seatService.holdSeats(request);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Release held seats
   * POST /api/v1/seats/release
   */
  releaseSeats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { holdId } = req.body;

      if (!holdId) {
        res.status(400).json({
          success: false,
          error: 'holdId is required',
        });
        return;
      }

      await this.seatService.releaseHeldSeats(holdId);

      res.status(200).json({
        success: true,
        message: 'Seats released successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate seat numbers for a route
   * POST /api/v1/seats/validate
   */
  validateSeats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { routeId, seats } = req.body;

      if (!routeId || !seats || !Array.isArray(seats)) {
        res.status(400).json({
          success: false,
          error: 'routeId and seats array are required',
        });
        return;
      }

      const result = await this.seatService.validateSeatNumbers(routeId, seats);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Admin: block seats for maintenance on one route/date
   * POST /api/v1/seats/admin/block
   *
   * The trimmed body is left on `res.locals.adminSeatBlockBody` by
   * `validateAdminSeatBlockBody`.
   */
  adminBlockSeats = async (
    req: AuthRequest,
    res: Response<unknown, AdminSeatBlockBodyLocals>,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const result = await this.seatService.blockSeats(
        res.locals.adminSeatBlockBody,
        req.user
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Admin: remove a maintenance block on one route/date
   * POST /api/v1/seats/admin/unblock
   */
  adminUnblockSeats = async (
    req: AuthRequest,
    res: Response<unknown, AdminSeatUnblockBodyLocals>,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const result = await this.seatService.unblockSeats(
        res.locals.adminSeatUnblockBody,
        req.user
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
