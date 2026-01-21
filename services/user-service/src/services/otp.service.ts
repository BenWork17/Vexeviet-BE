import { prisma, UserStatus } from '../config/database';
import { CryptoUtils } from '../utils/crypto';
import { emailService } from '../utils/email';
import { smsService } from '../utils/sms';

export class OTPService {
  private readonly OTP_EXPIRY_MINUTES = 10;

  async generateAndSend(
    userId: string,
    method: 'email' | 'phone'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const code = CryptoUtils.generateVerificationCode();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      await prisma.user.update({
        where: { id: userId },
        data: {
          verificationCode: code,
          verificationCodeExpiry: expiresAt,
        },
      });

      if (method === 'email' && user.email) {
        await emailService.sendVerificationEmail(user.email, code);
        return { success: true, message: 'Verification code sent to email' };
      } else if (method === 'phone' && user.phone) {
        smsService.sendVerificationSMS(user.phone, code);
        return { success: true, message: 'Verification code sent to phone' };
      }

      return { success: false, message: 'No valid contact method found' };
    } catch (error) {
      console.error('Failed to generate and send OTP:', error);
      throw new Error('Failed to send verification code');
    }
  }

  async verify(userId: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      if (!user.verificationCode || !user.verificationCodeExpiry) {
        return { success: false, message: 'No verification code found. Please request a new one.' };
      }

      if (new Date() > user.verificationCodeExpiry) {
        return { success: false, message: 'Verification code has expired. Please request a new one.' };
      }

      if (user.verificationCode !== code) {
        return { success: false, message: 'Invalid verification code' };
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.ACTIVE,
          isEmailVerified: user.registrationMethod === 'email' ? true : user.isEmailVerified,
          isPhoneVerified: user.registrationMethod === 'phone' ? true : user.isPhoneVerified,
          verificationCode: null,
          verificationCodeExpiry: null,
        },
      });

      return { success: true, message: 'Verification successful' };
    } catch (error) {
      console.error('Failed to verify OTP:', error);
      throw new Error('Verification failed');
    }
  }

  async resend(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      if (user.status === 'ACTIVE') {
        return { success: false, message: 'User already verified' };
      }

      const method = user.registrationMethod as 'email' | 'phone' | null;
      if (!method) {
        return { success: false, message: 'Registration method not found' };
      }

      return await this.generateAndSend(userId, method);
    } catch (error) {
      console.error('Failed to resend OTP:', error);
      throw new Error('Failed to resend verification code');
    }
  }

  async cleanup(): Promise<number> {
    try {
      const result = await prisma.user.updateMany({
        where: {
          verificationCodeExpiry: {
            lt: new Date(),
          },
          verificationCode: {
            not: null,
          },
        },
        data: {
          verificationCode: null,
          verificationCodeExpiry: null,
        },
      });

      console.log(`Cleaned up ${result.count} expired verification codes`);
      return result.count;
    } catch (error) {
      console.error('Failed to cleanup expired OTPs:', error);
      return 0;
    }
  }
}

export const otpService = new OTPService();
