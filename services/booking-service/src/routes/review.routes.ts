import { Router, IRouter } from 'express';
import { ReviewController } from '../controllers/review.controller';
import {
  authMiddleware,
  customerOnly,
  operatorOrAdmin,
} from '../middlewares/auth.middleware';
import {
  createReviewSchema,
  eligibilityQuerySchema,
  manageReviewsQuerySchema,
  manageStatsQuerySchema,
  myReviewsQuerySchema,
  publicOperatorReviewsQuerySchema,
  replyReviewSchema,
  validateReviewBody,
  validateReviewQuery,
} from '../validators/review.validator';

const router: IRouter = Router();
const reviewController = new ReviewController();

const UUID_PARAM = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

// =====================================================
// OPERATOR / ADMIN MANAGEMENT ROUTES (literal paths first)
// =====================================================

/**
 * @route   GET /api/v1/reviews/manage/stats
 * @desc    Operator/Admin review statistics
 * @access  Private (OPERATOR scoped to own operatorId; ADMIN optional ?operatorId)
 */
router.get(
  '/reviews/manage/stats',
  authMiddleware,
  operatorOrAdmin,
  validateReviewQuery(manageStatsQuerySchema),
  reviewController.getManageStats
);

/**
 * @route   GET /api/v1/reviews/manage
 * @desc    Operator/Admin paginated reviews list with filters
 * @access  Private (OPERATOR scoped to own operatorId; ADMIN optional ?operatorId)
 */
router.get(
  '/reviews/manage',
  authMiddleware,
  operatorOrAdmin,
  validateReviewQuery(manageReviewsQuerySchema),
  reviewController.getManageReviews
);

/**
 * @route   PUT /api/v1/reviews/manage/:id/reply
 * @desc    Operator/Admin reply to a review (overwrites existing reply)
 * @access  Private (OPERATOR own reviews only; ADMIN any)
 */
router.put(
  `/reviews/manage/:id(${UUID_PARAM})/reply`,
  authMiddleware,
  operatorOrAdmin,
  validateReviewBody(replyReviewSchema),
  reviewController.replyToReview
);

// =====================================================
// CUSTOMER ROUTES
// =====================================================

/**
 * @route   GET /api/v1/reviews/my
 * @desc    Get authenticated customer's submitted reviews
 * @access  Private (CUSTOMER)
 */
router.get(
  '/reviews/my',
  authMiddleware,
  customerOnly,
  validateReviewQuery(myReviewsQuerySchema),
  reviewController.getMyReviews
);

/**
 * @route   GET /api/v1/reviews/eligibility
 * @desc    Batch check review eligibility for booking IDs
 * @access  Private (CUSTOMER)
 */
router.get(
  '/reviews/eligibility',
  authMiddleware,
  customerOnly,
  validateReviewQuery(eligibilityQuerySchema),
  reviewController.getEligibility
);

/**
 * @route   POST /api/v1/reviews
 * @desc    Submit a review for a completed booking
 * @access  Private (CUSTOMER)
 */
router.post(
  '/reviews',
  authMiddleware,
  customerOnly,
  validateReviewBody(createReviewSchema),
  reviewController.createReview
);

// =====================================================
// PUBLIC ROUTES (Booking / Route pages)
// =====================================================

/**
 * @route   GET /api/v1/reviews/operators/:operatorId/summary
 * @desc    Public operator rating summary (average, count, 1-5 distribution)
 * @access  Public
 */
router.get(
  `/reviews/operators/:operatorId(${UUID_PARAM})/summary`,
  reviewController.getOperatorSummary
);

/**
 * @route   GET /api/v1/reviews/operators/:operatorId
 * @desc    Public paginated list of VISIBLE reviews for an operator
 * @access  Public
 */
router.get(
  `/reviews/operators/:operatorId(${UUID_PARAM})`,
  validateReviewQuery(publicOperatorReviewsQuerySchema),
  reviewController.getPublicOperatorReviews
);

export default router;
