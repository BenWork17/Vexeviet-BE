import { Router, IRouter, RequestHandler } from 'express';
import { RouteController } from '../controllers/route.controller';
import {
  authMiddleware,
  operatorMiddleware,
  adminMiddleware,
} from '../middlewares/auth.middleware';
import {
  validateCreateRoute,
  validateUpdateRoute,
  validateAdminRouteQuery,
  validateAdminOperatorQuery,
} from '../validators/route.validator';

const router: IRouter = Router();
const routeController = new RouteController();

// ---------------------------------------------------------------------------
// Registration order is load-bearing.
//
// Static paths MUST be registered before the `/:id` parameter routes. Under
// path-to-regexp 0.1.12 (Express 4) `/:id` compiles to a single-segment matcher,
// so it does not actually swallow two-segment paths such as `/my/routes` or
// `/admin/all`; the order below is nonetheless kept static-first so that it
// stays correct if `:id` is ever loosened or a future path gains a segment.
// ---------------------------------------------------------------------------

// Admin (ADMIN only) — static, must precede `/:id`
router.get(
  '/admin/all',
  authMiddleware,
  adminMiddleware,
  validateAdminRouteQuery,
  routeController.findAdminRoutes as RequestHandler
);
router.get(
  '/admin/operators',
  authMiddleware,
  adminMiddleware,
  validateAdminOperatorQuery,
  routeController.findAdminOperators as RequestHandler
);

// Operator own-route listing — static, must precede `/:id`
router.get(
  '/my/routes',
  authMiddleware,
  operatorMiddleware,
  routeController.findMyRoutes as RequestHandler
);

// Public routes
router.get('/', routeController.findAll as RequestHandler);
router.get('/:id', routeController.findById as RequestHandler);

// Protected routes (Operator/Admin only). `operatorMiddleware` admits ADMIN too,
// which is what lets an ADMIN act on a route it does not own.
router.post('/', authMiddleware, operatorMiddleware, validateCreateRoute, routeController.create as RequestHandler);
router.put('/:id', authMiddleware, operatorMiddleware, validateUpdateRoute, routeController.update as RequestHandler);
router.delete('/:id', authMiddleware, operatorMiddleware, routeController.delete as RequestHandler);

export default router;
