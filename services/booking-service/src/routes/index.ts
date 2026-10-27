import { Router, IRouter } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { SeatController } from '../controllers/seat.controller';
import {
  authMiddleware,
  optionalAuth,
  adminOnly,
  operatorOrAdmin,
} from '../middlewares/auth.middleware';
import { internalKeyMiddleware } from '../middlewares/internal-key.middleware';
import {
  validateBody,
  createBookingSchema,
  cancelBookingSchema,
  checkSeatsSchema,
  holdSeatsSchema,
  validateSeatsSchema,
} from '../validators/booking.validator';
import {
  validateAdminBookingQuery,
  validateAdminDashboardQuery,
  validateAdminCancelBody,
  validateAdminBulkCancelBody,
  validateAdminBookingNotesBody,
} from '../validators/admin-booking.validator';

const router: IRouter = Router();
const bookingController = new BookingController();
const seatController = new SeatController();

// =====================================================
// BOOKING ROUTES
// =====================================================

/**
 * @route   GET /api/v1/bookings/admin/all
 * @desc    List all bookings for the admin console (paginated, Shape 1)
 * @access  Private (ADMIN sees all; OPERATOR is scoped to their own routes)
 *
 * Registered before `/bookings/:id` so the literal `admin` segment is not
 * swallowed by the uuid parameter route.
 */
router.get(
  '/bookings/admin/all',
  authMiddleware,
  operatorOrAdmin,
  validateAdminBookingQuery,
  bookingController.getAdminBookings
);

/**
 * @route   GET /api/v1/bookings/admin/dashboard
 * @desc    Aggregated booking/revenue stats for the admin dashboard
 * @access  Private (ADMIN only)
 */
router.get(
  '/bookings/admin/dashboard',
  authMiddleware,
  adminOnly,
  validateAdminDashboardQuery,
  bookingController.getAdminDashboard
);

/** UUID path-parameter constraint, matching the sibling customer routes. */
const UUID_PARAM = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/**
 * @route   POST /api/v1/bookings/admin/cancel
 * @desc    Cancel a batch of bookings in one request (per-item outcomes)
 * @access  Private (ADMIN only)
 *
 * Registered **before** `/bookings/admin/:id/cancel`. Two independent
 * mechanisms keep `cancel` from being read as an `:id`: this ordering, and the
 * uuid constraint on `:id` below (a literal `cancel` cannot match the uuid
 * pattern). Neither alone is relied upon silently — see the router dump.
 */
router.post(
  '/bookings/admin/cancel',
  authMiddleware,
  adminOnly,
  validateAdminBulkCancelBody,
  bookingController.adminBulkCancel
);

/**
 * @route   POST /api/v1/bookings/admin/:id/cancel
 * @desc    Cancel any booking on behalf of an ADMIN, with a stated reason
 * @access  Private (ADMIN only)
 */
router.post(
  `/bookings/admin/:id(${UUID_PARAM})/cancel`,
  authMiddleware,
  adminOnly,
  validateAdminCancelBody,
  bookingController.adminCancel
);

/**
 * @route   PATCH /api/v1/bookings/admin/:id/notes
 * @desc    Set (or clear, with `null`) the internal note on a booking
 * @access  Private (ADMIN only)
 */
router.patch(
  `/bookings/admin/:id(${UUID_PARAM})/notes`,
  authMiddleware,
  adminOnly,
  validateAdminBookingNotesBody,
  bookingController.adminNotes
);

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
 * @access  Internal (requires x-internal-api-key; fail-closed when unset)
 */
router.post(
  '/bookings/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/confirm',
  internalKeyMiddleware,
  bookingController.confirm
);

/**
 * @route   POST /api/v1/bookings/:id/payment-failed
 * @desc    Mark a booking's payment as failed (internal API - called by payment-service)
 * @access  Internal (requires x-internal-api-key; fail-closed when unset)
 */
router.post(
  '/bookings/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/payment-failed',
  internalKeyMiddleware,
  bookingController.markPaymentFailed
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
