import { writeAuditLog } from '@vexeviet/database';
import { UserRole, UserStatus } from '@prisma/client';
import { AdminResendVerificationResult, AdminUser, Pagination, User } from '../types';
import { emailService } from '../utils/email';
import { otpService } from './otp.service';
import { passwordResetService } from './password-reset.service';
import {
  AdminUserFilters,
  AdminUserRow,
  AdminUserUpdateData,
  UserRepository,
} from '../repositories/user.repository';

export interface AdminUserPage {
  items: AdminUser[];
  pagination: Pagination;
}

/**
 * Response of `POST /users/admin/:id/reset-password`.
 *
 * Carries the expiry only. The raw token goes into the email and nowhere else:
 * a token in a response body is one copy-paste away from a leak, in every
 * environment including development.
 */
export interface AdminResetPasswordResult {
  expiresAt: string;
}

/** The acting admin, taken from the JWT (and resolved to a display name). */
export interface AuditActor {
  userId: string;
  email: string;
}

/** Raised with an explicit status so the controller does not have to guess. */
export class UserServiceError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'UserServiceError';
    this.statusCode = statusCode;
  }
}

const toAdminUser = (row: AdminUserRow): AdminUser => ({
  id: row.id,
  name: `${row.firstName} ${row.lastName}`.trim(),
  email: row.email,
  phone: row.phone,
  role: row.role,
  status: row.status,
  verified: row.isEmailVerified && row.isPhoneVerified,
  isEmailVerified: row.isEmailVerified,
  isPhoneVerified: row.isPhoneVerified,
  createdAt: row.createdAt,
});

const toPagination = (page: number, limit: number, total: number): Pagination => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export class UserService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);

    if (!user) {
      throw new Error('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(id: string, updates: any): Promise<User> {
    if (!updates) {
      throw new Error('No updates provided');
    }
    // Handle fullName from FE/Test
    if (updates.fullName && typeof updates.fullName === 'string') {
      const parts = updates.fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        updates.firstName = parts[0];
        updates.lastName = parts.slice(1).join(' ');
      } else {
        updates.firstName = updates.fullName;
      }
      delete updates.fullName;
    }

    // Remove fields that shouldn't be updated directly
    const { password: _p, role, createdAt, updatedAt, id: _id, ...safeUpdates } = updates;

    const user = await this.userRepo.update(id, safeUpdates);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async deleteUser(id: string): Promise<void> {
    await this.userRepo.delete(id);
  }

  async getUserCount(): Promise<number> {
    return this.userRepo.count();
  }

  // =====================================================
  // ADMIN
  // =====================================================

  async listAdminUsers(filters: AdminUserFilters): Promise<AdminUserPage> {
    const { items, total } = await this.userRepo.findAdminUsers(filters);

    return {
      items: items.map(toAdminUser),
      pagination: toPagination(filters.page, filters.limit, total),
    };
  }

  /**
   * Change an admin-managed user's role and/or status.
   *
   * Guards, in order:
   *  - missing row            → 404
   *  - target is the caller   → 400 (self-lockout)
   *  - last ACTIVE ADMIN loses ADMIN or ACTIVE → 409
   */
  async updateAdminUser(
    id: string,
    updates: AdminUserUpdateData,
    actor: AuditActor
  ): Promise<AdminUser> {
    const target = await this.userRepo.findAdminUserById(id);

    if (!target) {
      throw new UserServiceError('User not found', 404);
    }

    if (target.id === actor.userId) {
      throw new UserServiceError(
        'You cannot change your own role or status',
        400
      );
    }

    const nextRole = updates.role ?? target.role;
    const nextStatus = updates.status ?? target.status;
    const losesActiveAdmin =
      target.role === UserRole.ADMIN &&
      target.status === UserStatus.ACTIVE &&
      !(nextRole === UserRole.ADMIN && nextStatus === UserStatus.ACTIVE);

    if (losesActiveAdmin) {
      const remainingActiveAdmins = await this.userRepo.countActiveAdmins(target.id);
      if (remainingActiveAdmins === 0) {
        throw new UserServiceError(
          'Cannot demote or deactivate the last active admin',
          409
        );
      }
    }

    const updated = await this.userRepo.updateAdminUser(id, updates);
    const actorName = await this.resolveActorName(actor);

    if (updates.role !== undefined && updates.role !== target.role) {
      await this.emitAudit({
        actorId: actor.userId,
        actorName,
        actorRole: 'ADMIN',
        action: 'USER_ROLE_UPDATED',
        target: `user:${id}`,
        targetId: id,
        severity: 'WARNING',
        metadata: { from: target.role, to: updates.role },
      });
    }

    if (updates.status !== undefined && updates.status !== target.status) {
      await this.emitAudit({
        actorId: actor.userId,
        actorName,
        actorRole: 'ADMIN',
        action: 'USER_STATUS_UPDATED',
        target: `user:${id}`,
        targetId: id,
        severity: 'WARNING',
        metadata: { from: target.status, to: updates.status },
      });
    }

    return toAdminUser(updated);
  }

  /**
   * Re-send the verification code to an unverified user (admin Users screen).
   *
   * Email only: the SMS path is not configured, so a phone-registered user is
   * refused rather than silently reported as sent.
   *
   * Guards, in order (all 409, in the order the buttons map to them):
   *  - missing row                          → 404
   *  - no `registrationMethod`              → 409
   *  - `registrationMethod === 'phone'`     → 409 (no SMS provider)
   *  - `status === 'ACTIVE'`                → 409 "User already verified"
   *  - no email on the row                  → 409
   *
   * The ACTIVE check mirrors `otpService.resend`: calling `generateAndSend`
   * directly must not become a way to mail an already-verified account, which
   * would be a nuisance-mail vector.
   */
  async resendVerification(id: string, actor: AuditActor): Promise<AdminResendVerificationResult> {
    const target = await this.userRepo.findById(id);

    if (!target) {
      throw new UserServiceError('User not found', 404);
    }

    // `registrationMethod` is a free-form String column, so normalize before
    // deciding; anything that is not email/phone is refused rather than guessed.
    const method = target.registrationMethod?.trim().toLowerCase() ?? '';

    if (!method) {
      throw new UserServiceError('User has no registration method', 409);
    }

    if (method === 'phone') {
      throw new UserServiceError(
        'Cannot re-send verification: this user registered by phone and SMS delivery is not configured',
        409
      );
    }

    if (method !== 'email') {
      throw new UserServiceError(
        `Cannot re-send verification: unsupported registration method '${method}'`,
        409
      );
    }

    if (target.status === UserStatus.ACTIVE) {
      throw new UserServiceError('User already verified', 409);
    }

    if (!target.email) {
      throw new UserServiceError('User has no email address to send to', 409);
    }

    let delivery = { success: false, message: 'Failed to send verification code' };
    try {
      // `method` is narrowed to 'email' by the guards above.
      delivery = await otpService.generateAndSend(id, method);
    } catch (error) {
      delivery = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send verification code',
      };
    }

    const actorName = await this.resolveActorName(actor);

    await this.emitAudit({
      actorId: actor.userId,
      actorName,
      actorRole: 'ADMIN',
      action: 'USER_VERIFICATION_RESENT',
      target: `user:${id}`,
      targetId: id,
      severity: 'INFO',
      // Never the code itself — only how it was delivered and whether it went out.
      metadata: { method: 'email', deliverySucceeded: delivery.success },
    });

    if (!delivery.success) {
      // 502, not 500/409: the request was well-formed and authorised, the
      // upstream send failed. The code row may or may not have been written;
      // what the admin needs to know is "it did not go out".
      throw new UserServiceError(delivery.message, 502);
    }

    return { id, message: 'Verification code sent to email' };
  }

  /**
   * Admin-initiated password reset (`Reset mật khẩu` on the Users screen).
   *
   * Mints a single-use token, stores only `hashSHA256(token)` in Redis with a
   * 1-hour TTL, and mails the link. The raw token never leaves this method —
   * the caller receives the expiry only.
   *
   * 404 for an unknown row, deliberately: this is an admin-only endpoint, so the
   * caller is authenticated and already authorised to enumerate users through
   * `GET /users/admin/all`. The contract's "missing row → 404" rule applies and
   * hiding the miss would be an inconsistent lie to the console. The
   * *enumerable* surface is the public forgot-password route, which is uniform.
   *
   * 502 when the mail cannot be sent, matching `resendVerification`: the request
   * was well-formed and authorised, the upstream delivery failed, and the admin
   * needs to know the link did not go out.
   */
  async resetPassword(id: string, actor: AuditActor): Promise<AdminResetPasswordResult> {
    const target = await this.userRepo.findById(id);

    if (!target) {
      throw new UserServiceError('User not found', 404);
    }

    if (!target.email) {
      throw new UserServiceError('User has no email address to send to', 409);
    }

    const { token, expiresAt } = await passwordResetService.issue(target.id);

    let deliverySucceeded = false;
    try {
      await emailService.sendPasswordResetEmail(target.email, token);
      deliverySucceeded = true;
    } catch (error) {
      console.error('[user-service] failed to send password reset email', {
        userId: target.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const actorName = await this.resolveActorName(actor);

    await this.emitAudit({
      actorId: actor.userId,
      actorName,
      actorRole: 'ADMIN',
      action: 'USER_PASSWORD_RESET_REQUESTED',
      target: `user:${target.email}`,
      targetId: target.id,
      severity: 'WARNING',
      // No token, no hash, no password. Only who initiated it and whether the
      // mail went out.
      metadata: { initiatedBy: 'ADMIN', deliverySucceeded },
    });

    if (!deliverySucceeded) {
      throw new UserServiceError('Failed to send password reset email', 502);
    }

    return { expiresAt: expiresAt.toISOString() };
  }

  /**
   * `writeAuditLog` is already non-throwing by contract; this wrapper makes the
   * "an audit failure must never fail the request" rule hold even if a future
   * change to the helper regresses it.
   */
  private async emitAudit(input: Parameters<typeof writeAuditLog>[0]): Promise<void> {
    try {
      await writeAuditLog(input);
    } catch (error) {
      console.error('[user-service] failed to write admin audit log', {
        action: input.action,
        target: input.target,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * `writeAuditLog` requires a non-null actor name; fall back to the token
   * email when the actor row cannot be read.
   */
  private async resolveActorName(actor: AuditActor): Promise<string> {
    try {
      const row = await this.userRepo.findById(actor.userId);
      if (row) {
        const name = `${row.firstName} ${row.lastName}`.trim();
        if (name) return name;
      }
    } catch {
      // Fall through to the email fallback below.
    }
    return actor.email;
  }
}
