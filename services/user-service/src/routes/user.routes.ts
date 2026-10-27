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
 * @route   POST /api/v1/users/admin/:id/resend-verification
 * @desc    Re-send the email verification code to an unverified user
 * @access  ADMIN
 *
 * Registered inside the `/admin/*` block, ahead of `PATCH /admin/:id`. The two
 * cannot shadow each other: this path has a second literal segment
 * (`resend-verification`) that `PATCH /admin/:id` has no room for, and the
 * methods differ anyway (POST vs PATCH). No unconstrained `/:id` route exists in
 * this file, so `/admin/*` literals are never reached by an id-shaped URL.
 */
router.post('/admin/:id/resend-verification', authMiddleware, adminOnly, (req, res, next) => {
  userController.resendVerification(req, res).catch(next);
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
