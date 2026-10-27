import { Router, IRouter, Request, Response, NextFunction, RequestHandler } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authMiddleware, adminOnly, operatorOrAdmin } from '../middlewares/auth.middleware';
import {
  validateCreatePayment,
  validateRefund,
  validateAdminPaymentList,
  validateAdminPaymentSummary,
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
 * Current order: `/`, `/admin/all`, `/admin/summary`, `/status`, `/booking/:bookingId`,
 * `/:paymentId/cancel`, `/refund`, `/:paymentId`.
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

router.get(
  '/admin/summary',
  authMiddleware,
  adminOnly,
  validateAdminPaymentSummary,
  handler(paymentController.getAdminPaymentSummary)
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
