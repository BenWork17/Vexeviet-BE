import { User as PrismaUser, UserRole } from '@prisma/client';

export type User = Omit<PrismaUser, 'password'>;

export interface RegisterRequest {
  method: 'email' | 'phone';
  email?: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
  agreeToTerms: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface VerifyOTPRequest {
  userId: string;
  code: string;
}

export interface ResendOTPRequest {
  userId: string;
}

export { UserRole };
