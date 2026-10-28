import { Router, IRouter, Request, Response, NextFunction, RequestHandler } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authMiddleware, adminOnly, operatorOrAdmin } from '../middlewares/auth.middleware';
import {
  validateCreatePayment,
  validateRefund,
  validateAdminPaymentList,
  validateAdminPaymentSummary,
  validateAdminPaymentReconciliation,
  validateResyncBooking,
} from '../validators/payment.validator';

const router: IRouter = Router();

/**
 * Controllers are `async` and handle their own errors, but Express 4 accepts a
 * `void` handler. This adapter keeps `no-misused-promises` happy without turning
 * a rejected promise into an unhandled rejection.
 */
const handler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    void fn(req, res, next).catch(next);
  };

/**
 * REGISTRATION ORDER IS LOAD-BEARING.
 *
 * Express 4 matches in registration order, and `/:paymentId` is a single-segment
 * wildcard. Every literal path below must be registered BEFORE `/:paymentId`, or
 * `/admin/all` and `/admin/summary` would be swallowed and treated as payment ids
 * (yielding 400/404 instead of the admin payload). `/status` has the same hazard.
 *
 * Current order: `/`, `/admin/all`, `/admin/summary`, `/admin/reconciliation`,
 * `/admin/:paymentId/resync`, `/status`, `/booking/:bookingId`,
 * `/:paymentId/cancel`, `/refund`, `/:paymentId`.
 *
 * Neither admin addition can be shadowed: `/admin/reconciliation` is a literal
 * path, and `/admin/:paymentId/resync` has three segments, whereas
 * `/:paymentId` (last) and `/:paymentId/cancel` are single- and two-segment.
 * They stay above every parameterised route to keep the documented order intact.
 */

router.post('/', authMiddleware, validateCreatePayment, handler(paymentController.createPayment));

// --- Admin (literal paths — MUST precede `/:paymentId`) ---
router.get(
  '/admin/all',
  authMiddleware,
  operatorOrAdmin,
  validateAdminPaymentList,
  handler(paymentController.listAdminPayments)
);

// Operator-scoped summary: an OPERATOR's window covers only its own routes.
router.get(
  '/admin/summary',
  authMiddleware,
  operatorOrAdmin,
  validateAdminPaymentSummary,
  handler(paymentController.getAdminPaymentSummary)
);

// Read-only reconciliation report. ADMIN only: it spans every operator's data.
router.get(
  '/admin/reconciliation',
  authMiddleware,
  adminOnly,
  validateAdminPaymentReconciliation,
  handler(paymentController.listReconciliation)
);

// Manual repair of a failed payment→booking sync. ADMIN only — an OPERATOR must
// not be able to re-drive another operator's booking.
router.post(
  '/admin/:paymentId/resync',
  authMiddleware,
  adminOnly,
  validateResyncBooking,
  handler(paymentController.resyncPaymentBooking)
);

// --- Public-ish authenticated reads ---
router.get('/status', authMiddleware, handler(paymentController.getPaymentStatusByTransactionRef));

router.get('/booking/:bookingId', authMiddleware, handler(paymentController.getPaymentsByBooking));

// --- Parameterised: must stay last of the GETs ---
router.post('/:paymentId/cancel', authMiddleware, handler(paymentController.cancelPayment));

router.post(
  '/refund',
  authMiddleware,
  adminOnly,
  validateRefund,
  handler(paymentController.processRefund)
);

router.get('/:paymentId', authMiddleware, handler(paymentController.getPayment));

export default router;
