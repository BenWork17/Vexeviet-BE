import { writeAuditLog } from '@vexeviet/database';
import { UserRole, UserStatus } from '@prisma/client';
import { AdminUser, Pagination, User } from '../types';
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
