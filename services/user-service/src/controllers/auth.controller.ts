import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { otpService } from '../services/otp.service';
import { RegisterRequest, LoginRequest, VerifyOTPRequest, ResendOTPRequest } from '../types';
import { eventPublisher } from '../events/publisher';
import { createUserRegisteredEvent } from '../events/user.events';

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
}
