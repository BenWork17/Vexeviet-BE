import { Router, IRouter } from 'express';
import { UserController } from '../controllers/user.controller';
import { ImageController } from '../controllers/image.controller';
import { authMiddleware, adminOnly, operatorOrAdmin } from '../middlewares/auth.middleware';
import { singleImageUpload } from '../utils/image-upload';

const router: IRouter = Router();
const userController = new UserController();
const imageController = new ImageController();

// ---- Images (literal paths; declared before any `/:id`-shaped route) ----
router.post('/profile/avatar', authMiddleware, singleImageUpload, (req, res, next) => {
  imageController.uploadUserAvatar(req, res).catch(next);
});
router.delete('/profile/avatar', authMiddleware, (req, res, next) => {
  imageController.deleteUserAvatar(req, res).catch(next);
});

router.get('/operator/images', authMiddleware, operatorOrAdmin, (req, res, next) => {
  imageController.getOwnImages(req, res).catch(next);
});
router.put('/operator/avatar', authMiddleware, operatorOrAdmin, singleImageUpload, (req, res, next) => {
  imageController.putAvatar(req, res).catch(next);
});
router.delete('/operator/avatar', authMiddleware, operatorOrAdmin, (req, res, next) => {
  imageController.deleteAvatar(req, res).catch(next);
});
router.post(
  '/operator/images/:type',
  authMiddleware,
  operatorOrAdmin,
  singleImageUpload,
  (req, res, next) => {
    imageController.addGalleryImage(req, res).catch(next);
  }
);
router.delete('/operator/images/:type', authMiddleware, operatorOrAdmin, (req, res, next) => {
  imageController.deleteGalleryImage(req, res).catch(next);
});
// Public: shown on customer-facing pages.
router.get('/operators/:id/images', (req, res, next) => {
  imageController.getPublicImages(req, res).catch(next);
});

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
 * @route   POST /api/v1/users/admin/:id/reset-password
 * @desc    Issue a single-use password-reset link to the user's email
 * @access  ADMIN
 *
 * Same shape as `resend-verification` above and for the same reason: the second
 * literal segment (`reset-password`) plus POST leaves no overlap with
 * `PATCH /admin/:id`, and no unconstrained `/:id` route exists in this file. A
 * `PATCH /admin/<uuid>` request can never reach this handler (method mismatch)
 * and a `POST /admin/<uuid>/reset-password` can never reach the PATCH handler
 * (path length mismatch).
 */
router.post('/admin/:id/reset-password', authMiddleware, adminOnly, (req, res, next) => {
  userController.resetPassword(req, res).catch(next);
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
