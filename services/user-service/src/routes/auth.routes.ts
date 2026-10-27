import { Router, IRouter } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router: IRouter = Router();
const authController = new AuthController();

router.post('/register', validateRequest(registerSchema), (req, res, next) => {
  authController.register(req, res).catch(next);
});
router.post('/login', validateRequest(loginSchema), (req, res, next) => {
  authController.login(req, res).catch(next);
});
router.post('/refresh', (req, res, next) => {
  authController.refreshToken(req, res).catch(next);
});
router.post('/logout', (req, res, next) => {
  authController.logout(req, res).catch(next);
});
router.post('/verify-otp', validateRequest(verifyOtpSchema), (req, res, next) => {
  authController.verifyOTP(req, res).catch(next);
});
router.post('/resend-otp', validateRequest(resendOtpSchema), (req, res, next) => {
  authController.resendOTP(req, res).catch(next);
});

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request a password-reset link
 * @body    { email }
 * @access  Public — deliberately no auth middleware
 *
 * Always 200 with the same body, whether or not the email is registered. No
 * rate limiter is mounted here: there is no shared rate-limit middleware in
 * user-service, and P6 owns the gateway-side limiter.
 */
router.post('/forgot-password', validateRequest(forgotPasswordSchema), (req, res, next) => {
  authController.forgotPassword(req, res).catch(next);
});

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Consume a reset token and set a new password
 * @body    { token, newPassword }
 * @access  Public — deliberately no auth middleware
 */
router.post('/reset-password', validateRequest(resetPasswordSchema), (req, res, next) => {
  authController.resetPassword(req, res).catch(next);
});

export default router;
