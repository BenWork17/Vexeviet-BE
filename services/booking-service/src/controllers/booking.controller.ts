import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/booking.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { CreateBookingRequest, BookingQuery, CancelBookingRequest, BookingStatus } from '../types';
import {
  AdminBookingQueryLocals,
  AdminBookingNotesBodyLocals,
  AdminBulkCancelBodyLocals,
  AdminBulkConfirmBodyLocals,
  AdminCancelBodyLocals,
  AdminDashboardQueryLocals,
} from '../validators/admin-booking.validator';

export class BookingController {
  private bookingService: BookingService;

  constructor() {
    this.bookingService = new BookingService();
  }

  /**
   * Create a new booking
   * POST /api/v1/bookings
   */
  create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const data = req.body as CreateBookingRequest;
      const booking = await this.bookingService.createBooking(req.user.userId, data);

      res.status(201).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get booking by ID
   * GET /api/v1/bookings/:id
   */
  getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const bookingId = Array.isArray(id) ? id[0] : id;
      const booking = await this.bookingService.getBookingById(
        bookingId,
        req.user?.userId
      );

      res.status(200).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get booking by code
   * GET /api/v1/bookings/code/:code
   */
  getByCode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code } = req.params;
      const bookingCode = Array.isArray(code) ? code[0] : code;
      const booking = await this.bookingService.getBookingByCode(
        bookingCode,
        req.user?.userId
      );

      res.status(200).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user's bookings
   * GET /api/v1/bookings/my
   */
  getMyBookings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const query: BookingQuery = {
        status: req.query.status as BookingStatus,
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        sortBy: req.query.sortBy as BookingQuery['sortBy'],
        sortOrder: req.query.sortOrder as BookingQuery['sortOrder'],
      };

      const result = await this.bookingService.getUserBookings(
        req.user.userId,
        query
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cancel booking
   * POST /api/v1/bookings/:id/cancel
   */
  cancel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const bookingId = Array.isArray(id) ? id[0] : id;
      const { reason } = req.body as CancelBookingRequest;

      const booking = await this.bookingService.cancelBooking(
        bookingId,
        req.user.userId,
        reason
      );

      res.status(200).json({
        success: true,
        data: booking,
        message: 'Booking cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Confirm booking (internal API - called after payment)
   * POST /api/v1/bookings/:id/confirm
   */
  confirm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const bookingId = Array.isArray(id) ? id[0] : id;

      // TODO: Add internal API key validation
      const booking = await this.bookingService.confirmBooking(bookingId);

      res.status(200).json({
        success: true,
        data: booking,
        message: 'Booking confirmed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  markPaymentFailed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const bookingId = Array.isArray(id) ? id[0] : id;
      const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;

      const booking = await this.bookingService.markPaymentFailed(bookingId, reason);

      res.status(200).json({
        success: true,
        data: booking,
        message: 'Booking marked as payment failed',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Admin: list all bookings
   * GET /api/v1/bookings/admin/all
   *
   * Query params are validated/clamped by `validateAdminBookingQuery`, which
   * leaves the parsed result on `res.locals`.
   */
  getAdminBookings = async (
    req: AuthRequest,
    res: Response<unknown, AdminBookingQueryLocals>,
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

      const result = await this.bookingService.getAdminBookings(
        req.user,
        res.locals.adminBookingQuery
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Admin: dashboard aggregates
   * GET /api/v1/bookings/admin/dashboard
   */
  getAdminDashboard = async (
    _req: Request,
    res: Response<unknown, AdminDashboardQueryLocals>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await this.bookingService.getAdminDashboard(res.locals.adminDashboardDays);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Admin: cancel any booking regardless of its owner
   * POST /api/v1/bookings/admin/:id/cancel
   *
   * The reason is required and validated by `validateAdminCancelBody`, which
   * leaves the trimmed body on `res.locals.adminCancelBody`.
   */
  adminCancel = async (
    req: AuthRequest,
    res: Response<unknown, AdminCancelBodyLocals>,
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

      const { id } = req.params;
      const bookingId = Array.isArray(id) ? id[0] : id;

      const booking = await this.bookingService.cancelBookingAsAdmin(
        bookingId,
        req.user,
        res.locals.adminCancelBody.reason
      );

      res.status(200).json({
        success: true,
        data: booking,
        message: 'Booking cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Admin: cancel a batch of bookings in one request
   * POST /api/v1/bookings/admin/cancel
   *
   * Always `200` with a per-item outcome list when the body is valid: one
   * failing booking must not turn the batch into an all-or-nothing error.
   */
  adminBulkCancel = async (
    req: AuthRequest,
    res: Response<unknown, AdminBulkCancelBodyLocals>,
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

      const { ids, reason } = res.locals.adminBulkCancelBody;

      const result = await this.bookingService.cancelBookingsAsAdmin(ids, req.user, reason);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Admin: confirm a batch of bookings in one request
   * POST /api/v1/bookings/admin/confirm
   *
   * Always `200` with a per-item outcome list when the body is valid: an
   * unpaid or moved-on booking is reported on its own item, never as a batch
   * failure.
   */
  adminBulkConfirm = async (
    req: AuthRequest,
    res: Response<unknown, AdminBulkConfirmBodyLocals>,
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

      const { ids } = res.locals.adminBulkConfirmBody;

      const result = await this.bookingService.confirmBookingsAsAdmin(ids, req.user);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Admin: set or clear the internal note on a booking
   * PATCH /api/v1/bookings/admin/:id/notes
   */
  adminNotes = async (
    req: AuthRequest,
    res: Response<unknown, AdminBookingNotesBodyLocals>,
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

      const { id } = req.params;
      const bookingId = Array.isArray(id) ? id[0] : id;

      const booking = await this.bookingService.updateBookingNotesAsAdmin(
        bookingId,
        req.user,
        res.locals.adminBookingNotesBody.notes
      );

      res.status(200).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  };
}
