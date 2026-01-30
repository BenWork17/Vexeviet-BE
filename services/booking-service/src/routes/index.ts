import { Router, IRouter } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { SeatController } from '../controllers/seat.controller';
import { authMiddleware, optionalAuth } from '../middlewares/auth.middleware';
import {
  validateBody,
  createBookingSchema,
  cancelBookingSchema,
  checkSeatsSchema,
  holdSeatsSchema,
  validateSeatsSchema,
} from '../validators/booking.validator';

const router: IRouter = Router();
const bookingController = new BookingController();
const seatController = new SeatController();

// =====================================================
// BOOKING ROUTES
// =====================================================

/**
 * @route   GET /api/v1/bookings/code/:code
 * @desc    Get booking by booking code
 * @access  Private/Public (optional auth - returns limited info without auth)
 */
router.get('/bookings/code/:code', optionalAuth, bookingController.getByCode);

/**
 * @route   POST /api/v1/bookings
 * @desc    Create a new booking
 * @access  Private (requires auth)
 */
router.post(
  '/bookings',
  authMiddleware,
  validateBody(createBookingSchema),
  bookingController.create
);

/**
 * @route   GET /api/v1/bookings/my
 * @desc    Get current user's bookings
 * @access  Private (requires auth)
 */
router.get('/bookings/my', authMiddleware, bookingController.getMyBookings);

/**
 * @route   GET /api/v1/bookings/:id
 * @desc    Get booking by ID
 * @access  Private (requires auth)
 */
router.get(
  '/bookings/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})',
  authMiddleware,
  bookingController.getById
);

/**
 * @route   POST /api/v1/bookings/:id/cancel
 * @desc    Cancel a booking
 * @access  Private (requires auth)
 */
router.post(
  '/bookings/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/cancel',
  authMiddleware,
  validateBody(cancelBookingSchema),
  bookingController.cancel
);

/**
 * @route   POST /api/v1/bookings/:id/confirm
 * @desc    Confirm a booking (internal API - called after payment)
 * @access  Internal (requires API key - TODO: implement)
 */
router.post(
  '/bookings/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/confirm',
  bookingController.confirm
);

// =====================================================
// SEAT ROUTES
// =====================================================

/**
 * @route   GET /api/v1/seats/availability
 * @desc    Get seat availability for a route/date
 * @access  Public
 */
router.get('/seats/availability', seatController.getAvailability);

/**
 * @route   POST /api/v1/seats/check
 * @desc    Check if specific seats are available
 * @access  Public
 */
router.post(
  '/seats/check',
  validateBody(checkSeatsSchema),
  seatController.checkSeats
);

/**
 * @route   POST /api/v1/seats/hold
 * @desc    Temporarily hold seats (before creating booking)
 * @access  Private (requires auth)
 */
router.post(
  '/seats/hold',
  authMiddleware,
  validateBody(holdSeatsSchema),
  seatController.holdSeats
);

/**
 * @route   POST /api/v1/seats/release
 * @desc    Release held seats
 * @access  Private (requires auth)
 */
router.post('/seats/release', authMiddleware, seatController.releaseSeats);

/**
 * @route   POST /api/v1/seats/validate
 * @desc    Validate seat numbers for a route
 * @access  Public
 */
router.post(
  '/seats/validate',
  validateBody(validateSeatsSchema),
  seatController.validateSeats
);

export default router;
