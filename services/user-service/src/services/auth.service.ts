import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { RegisterRequest, LoginRequest, AuthResponse, TokenPayload } from '../types';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
  private readonly JWT_EXPIRES_IN = '15m';
  private readonly REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;

  private userRepo: UserRepository;
  private refreshTokenRepo: RefreshTokenRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.refreshTokenRepo = new RefreshTokenRepository();
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const identifier = data.method === 'email' ? data.email : data.phone;

    if (!identifier) {
      throw new Error('Email or phone is required');
    }

    // Check if user already exists
    if (data.method === 'email' && data.email) {
      const existingUser = await this.userRepo.findByEmail(data.email);
      if (existingUser) {
        throw new Error('Email already registered');
      }
    }

    if (data.method === 'phone' && data.phone) {
      const existingPhone = await this.userRepo.findByPhone(data.phone);
      if (existingPhone) {
        throw new Error('Phone number already registered');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await this.userRepo.create({
      email: data.email || `user_${Date.now()}@temp.vexeviet.com`, // Temporary email for phone registration
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: UserRole.CUSTOMER,
      registrationMethod: data.method,
      termsAcceptedAt: data.agreeToTerms ? new Date() : undefined,
      status: 'PENDING_VERIFICATION',
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    // Find user by email
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Return user without password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Find refresh token in database
    const storedToken = await this.refreshTokenRepo.findByToken(token);
    
    if (!storedToken || !storedToken.user) {
      throw new Error('Invalid refresh token');
    }

    // Check if expired
    if (storedToken.expiresAt < new Date()) {
      await this.refreshTokenRepo.deleteByToken(token);
      throw new Error('Refresh token expired');
    }

    // Verify JWT
    try {
      jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      await this.refreshTokenRepo.deleteByToken(token);
      throw new Error('Invalid refresh token');
    }

    // Delete old refresh token
    await this.refreshTokenRepo.deleteByToken(token);

    // Generate new tokens
    const user = storedToken.user;
    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(token: string): Promise<void> {
    // Delete refresh token from database
    await this.refreshTokenRepo.deleteByToken(token);
  }

  async logoutAll(userId: string): Promise<void> {
    // Delete all refresh tokens for user
    await this.refreshTokenRepo.deleteByUserId(userId);
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = {
      userId,
      email,
      role,
    };

    // Generate access token (short-lived)
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: `${this.REFRESH_TOKEN_EXPIRES_IN_DAYS}d`,
    });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRES_IN_DAYS);

    await this.refreshTokenRepo.create({
      token: refreshToken,
      user: { connect: { id: userId } },
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
  }

  // Cleanup expired tokens (should be run periodically)
  async cleanupExpiredTokens(): Promise<number> {
    return this.refreshTokenRepo.deleteExpired();
  }
}
