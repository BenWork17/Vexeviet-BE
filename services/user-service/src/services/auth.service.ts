import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole, UserStatus } from '@prisma/client';
import { writeAuditLog } from '@vexeviet/database';
import { RegisterRequest, LoginRequest, AuthResponse, TokenPayload } from '../types';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { CryptoUtils } from '../utils/crypto';
import { emailService } from '../utils/email';
import { passwordResetService } from './password-reset.service';

/** One message for unknown, expired and already-used tokens — they must not be
 * distinguishable. Names the field so the client knows what to re-request. */
const RESET_TOKEN_REJECTED = 'token is invalid or has expired';

/**
 * The statuses a session may never be minted for.
 *
 * `PENDING_VERIFICATION` is deliberately absent. Nothing in this codebase
 * produces it (`register()` writes `ACTIVE`, the OTP path writes `ACTIVE`), so
 * a check for it would be dead code today while locking out any legacy row
 * that carries it for no benefit. Adding it is a product decision, not a fix.
 *
 * Refusing here also cannot retroactively kill an already-issued access token:
 * that token is valid for its remaining ≤15 minutes by design, the same
 * accepted residual recorded in the admin-wave ledger. Enforcing status on
 * every authenticated request is out of scope for this gate.
 */
const REFUSED_STATUSES: ReadonlySet<UserStatus> = new Set<UserStatus>([
  UserStatus.SUSPENDED,
  UserStatus.DELETED,
]);

/** A caller here already holds a valid refresh token, so naming the reason
 * leaks nothing an enumeration attack could use. */
const ACCOUNT_REFUSED = 'Account is suspended or deleted';

/** Raised with an explicit status so a controller does not have to guess. */
export class AuthServiceError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthServiceError';
    this.statusCode = statusCode;
  }
}

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
    const email = data.email?.toLowerCase();
    const identifier = data.method === 'email' ? email : data.phone;

    if (!identifier) {
      throw new Error('Email or phone is required');
    }

    // Check if user already exists
    if (data.method === 'email' && email) {
      const existingUser = await this.userRepo.findByEmail(email);
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
      email: email || `user_${Date.now()}@temp.vexeviet.com`, // Temporary email for phone registration
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: UserRole.CUSTOMER,
      registrationMethod: data.method,
      termsAcceptedAt: data.agreeToTerms ? new Date() : undefined,
      status: 'ACTIVE',
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
    const email = data.email.toLowerCase();
    // Find user by email
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password);
    if (!isValidPassword) {
      throw new AuthServiceError('Invalid credentials', 401);
    }

    // Status is checked only after the password matched, and reports the very
    // same message as a bad password. A suspended account is therefore
    // indistinguishable from an unknown email or a wrong password, so this
    // cannot be used to confirm that a guess was correct. Nothing is minted or
    // persisted on this path.
    if (REFUSED_STATUSES.has(user.status)) {
      throw new AuthServiceError('Invalid credentials', 401);
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

    // A suspended or deleted account must not be able to mint a new pair. The
    // stored token is revoked rather than refused alone, following the
    // expired/invalid branches above, so it cannot be retried until it expires.
    // `findByToken` already includes the user, so the status is loaded.
    if (REFUSED_STATUSES.has(storedToken.user.status)) {
      await this.refreshTokenRepo.deleteByToken(token);
      throw new AuthServiceError(ACCOUNT_REFUSED, 401);
    }

    // Delete old refresh token
    await this.refreshTokenRepo.deleteByToken(token);

    // Generate new tokens
    const user = storedToken.user;
    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(token: string): Promise<void> {
    if (!token) return;
    // Delete refresh token from database
    await this.refreshTokenRepo.deleteByToken(token);
  }

  async logoutAll(userId: string): Promise<void> {
    // Delete all refresh tokens for user
    await this.refreshTokenRepo.deleteByUserId(userId);
  }

  /**
   * Public `POST /auth/forgot-password`.
   *
   * Deliberately returns nothing: the controller replies with the same 200 body
   * whether or not the address exists, so this endpoint cannot be used to
   * enumerate accounts.
   *
   * This method writes **no** audit row. A row per request would be an
   * unbounded write lever for anonymous traffic — there is no rate limiting on
   * this route (P6 owns it at the gateway), and even a *known* address only
   * costs an attacker one loop. The signal lives in
   * `USER_PASSWORD_RESET_COMPLETED` (written on the authenticated completion)
   * and in `USER_PASSWORD_RESET_REQUESTED` (written for the admin-initiated
   * path, where a real actor exists).
   */
  async forgotPassword(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const user = await this.userRepo.findByEmail(normalized);

    if (!user) return;

    const { token } = await passwordResetService.issue(user.id);

    // A send failure must not change the response: reporting it would reveal
    // that the address exists. The token simply goes unused and expires.
    try {
      await emailService.sendPasswordResetEmail(user.email, token);
    } catch (error) {
      console.error('[auth] failed to send password reset email', {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Public `POST /auth/reset-password`.
   *
   * `consume()` is the atomic GETDEL, so the token is gone before any hashing
   * work starts: a double submit cannot both succeed, and the loser gets the
   * same 400 as an unknown token.
   *
   * **Ordering is deliberate: revoke first, write the password second.** The two
   * writes live behind two separate repositories, so a single `$transaction`
   * would mean either reaching around both of them or threading a transaction
   * client through `logoutAll` and each repository — a signature change this fix
   * is not allowed to make. Revoking first instead makes the pair fail closed:
   *
   * - `logoutAll` throws → nothing was written. The caller gets a 500 and the
   *   credential is unchanged, so a half-applied reset cannot exist.
   * - The password update throws → sessions are already dead and the password is
   *   still the old one. The user is signed out but their credential is intact,
   *   which is the safe direction: an attacker holding a refresh token loses it
   *   either way.
   *
   * Either failure still returns 500 *after* the token was consumed by GETDEL, so
   * the flow is **not** retryable: the user must request a new reset link. That
   * is the price of never leaving a changed password beside live sessions.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await passwordResetService.consume(token);

    if (!record) {
      throw new AuthServiceError(RESET_TOKEN_REJECTED, 400);
    }

    const user = await this.userRepo.findById(record.userId);
    if (!user) {
      // The account went away between issue and consume. Same message: the
      // token state must stay indistinguishable from an unknown one.
      throw new AuthServiceError(RESET_TOKEN_REJECTED, 400);
    }

    const hashedPassword = await CryptoUtils.hashPassword(newPassword);

    // First write: every existing refresh token dies, so a session an attacker
    // already holds cannot be refreshed past this point. If this throws, the
    // password below is never touched.
    await this.logoutAll(user.id);

    // Second write: only reached once revocation succeeded, so a changed
    // password can never coexist with the sessions it was meant to end.
    await this.userRepo.update(user.id, { password: hashedPassword });

    await this.emitAudit({
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName}`.trim() || user.email,
      actorRole: user.role,
      action: 'USER_PASSWORD_RESET_COMPLETED',
      target: `user:${user.email}`,
      targetId: user.id,
      severity: 'WARNING',
      // No password, no hash, no token — only the fact and the revocation.
      metadata: { sessionsRevoked: true },
    });
  }

  /**
   * `writeAuditLog` is non-throwing by contract; this wrapper keeps an audit
   * failure from ever failing the request even if that helper regresses.
   */
  private async emitAudit(input: Parameters<typeof writeAuditLog>[0]): Promise<void> {
    try {
      await writeAuditLog(input);
    } catch (error) {
      console.error('[auth] failed to write audit log', {
        action: input.action,
        target: input.target,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
      jti: crypto.randomUUID(), // Add unique ID using built-in crypto module
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
