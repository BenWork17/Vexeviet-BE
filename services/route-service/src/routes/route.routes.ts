import { Router, IRouter, RequestHandler } from 'express';
import { RouteController } from '../controllers/route.controller';
import { authMiddleware, operatorMiddleware } from '../middlewares/auth.middleware';
import { validateCreateRoute, validateUpdateRoute } from '../validators/route.validator';

const router: IRouter = Router();
const routeController = new RouteController();

// Public routes
router.get('/', routeController.findAll as RequestHandler);
router.get('/:id', routeController.findById as RequestHandler);

// Protected routes (Operator/Admin only)
router.post('/', authMiddleware, operatorMiddleware, validateCreateRoute, routeController.create as RequestHandler);
router.put('/:id', authMiddleware, operatorMiddleware, validateUpdateRoute, routeController.update as RequestHandler);
router.delete('/:id', authMiddleware, operatorMiddleware, routeController.delete as RequestHandler);

// Get my routes (for operators)
router.get('/my/routes', authMiddleware, operatorMiddleware, routeController.findMyRoutes as RequestHandler);

export default router;
