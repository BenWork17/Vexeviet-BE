import { Router, IRouter } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
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

export default router;
