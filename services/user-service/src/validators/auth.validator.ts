import { z } from 'zod';

/**
 * The canonical password policy (registration). Exported so a password reset
 * cannot accept anything registration would reject — reuse, never duplicate.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z
  .object({
    method: z.enum(['email', 'phone'], {
      errorMap: () => ({ message: 'Registration method must be either email or phone' }),
    }),
    email: z.string().email('Invalid email format').optional(),
    phone: z
      .string()
      .regex(/^\+84[0-9]{9,10}$/, 'Invalid Vietnamese phone number format (+84xxxxxxxxx)')
      .optional(),
    password: passwordSchema,
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must not exceed 50 characters')
      .regex(/^[a-zA-ZÀ-ỹ\s]+$/, 'First name must contain only letters'),
    lastName: z
      .string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must not exceed 50 characters')
      .regex(/^[a-zA-ZÀ-ỹ\s]+$/, 'Last name must contain only letters'),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  })
  .refine(
    (data) => {
      if (data.method === 'email' && !data.email) {
        return false;
      }
      if (data.method === 'phone' && !data.phone) {
        return false;
      }
      return true;
    },
    {
      message: 'Email is required when registering with email, phone is required when registering with phone',
    }
  );

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyOtpSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export const resendOtpSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

/** Public `POST /auth/forgot-password`. Only the address is accepted. */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

/**
 * Public `POST /auth/reset-password`. The password rule is the registration
 * rule, so a reset can never set something registration would reject.
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});
