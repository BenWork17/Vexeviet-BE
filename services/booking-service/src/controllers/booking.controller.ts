import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/booking.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { CreateBookingRequest, BookingQuery, CancelBookingRequest, BookingStatus } from '../types';

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
}
