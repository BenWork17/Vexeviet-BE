import { Request, Response } from 'express';
import { AuthService, AuthServiceError } from '../services/auth.service';
import { otpService } from '../services/otp.service';
import { RegisterRequest, LoginRequest, VerifyOTPRequest, ResendOTPRequest } from '../types';
import { eventPublisher } from '../events/publisher';
import { createUserRegisteredEvent } from '../events/user.events';

/**
 * The one body both `forgot-password` branches return. Identical for a known and
 * an unknown address — that is what makes the endpoint non-enumerable, so it
 * must not gain any conditional field.
 */
const FORGOT_PASSWORD_ACCEPTED = {
  success: true,
  data: {
    message: 'If an account exists for that email, a password reset link has been sent',
  },
} as const;

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body as RegisterRequest;
      const result = await this.authService.register(data);

      // Publish user registered event
      const event = createUserRegisteredEvent(
        result.user.id,
        result.user.email,
        result.user.firstName,
        result.user.lastName,
        data.method
      );
      eventPublisher.publish(event);

      // Send OTP
      await otpService.generateAndSend(result.user.id, data.method);

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          verificationRequired: true,
          verificationMethod: data.method,
          message: `Verification code sent to your ${data.method}`,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body as LoginRequest;
      console.log(`[DEBUG] Login attempt for email: ${data.email}`);
      const result = await this.authService.login(data);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      const result = await this.authService.refreshToken(refreshToken);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
      });
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      await this.authService.logout(refreshToken);
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      });
    }
  };

  verifyOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body as VerifyOTPRequest;
      const result = await otpService.verify(data.userId, data.code);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      });
    }
  };

  resendOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body as ResendOTPRequest;
      const result = await otpService.resend(data.userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.message,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Resend failed',
      });
    }
  };

  /**
   * POST /api/v1/auth/forgot-password (public)
   *
   * Always 200 with the same body: an unknown address must be indistinguishable
   * from a known one. A transport failure is swallowed for the same reason.
   */
  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body as { email: string };
      await this.authService.forgotPassword(email);
    } catch (error) {
      // Swallowed on purpose: a distinct status here would leak account
      // existence. Anything unexpected is logged without the address.
      console.error('[auth] forgot-password failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    res.status(200).json(FORGOT_PASSWORD_ACCEPTED);
  };

  /**
   * POST /api/v1/auth/reset-password (public)
   *
   * Unknown, expired and already-used tokens all produce the same 400 naming
   * `token`, so the three states cannot be told apart.
   */
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body as { token: string; newPassword: string };
      await this.authService.resetPassword(token, newPassword);
      res.status(200).json({
        success: true,
        data: { message: 'Password has been reset. Please sign in again.' },
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset password',
      });
    }
  };
}
