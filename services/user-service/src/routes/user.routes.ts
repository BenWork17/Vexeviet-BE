import { Router, IRouter } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware, adminOnly } from '../middlewares/auth.middleware';

const router: IRouter = Router();
const userController = new UserController();

// `/profile` stays first: it must never be shadowed by a `/:id`-shaped route.
router.get('/profile', authMiddleware, (req, res, next) => {
  userController.getProfile(req, res).catch(next);
});
router.patch('/profile', authMiddleware, (req, res, next) => {
  userController.updateProfile(req, res).catch(next);
});
router.delete('/profile', authMiddleware, (req, res, next) => {
  userController.deleteAccount(req, res).catch(next);
});

/**
 * @route   GET /api/v1/users/admin/all
 * @desc    Paginated admin user list
 * @query   role, status, q, page, limit
 * @access  ADMIN
 */
router.get('/admin/all', authMiddleware, adminOnly, (req, res, next) => {
  userController.listAdminUsers(req, res).catch(next);
});

/**
 * @route   PATCH /api/v1/users/admin/:id
 * @desc    Change a user's role and/or status
 * @body    { role?, status? }
 * @access  ADMIN
 */
router.patch('/admin/:id', authMiddleware, adminOnly, (req, res, next) => {
  userController.updateAdminUser(req, res).catch(next);
});

export default router;
