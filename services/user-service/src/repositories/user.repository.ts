import { prisma } from '@vexeviet/database';
import { User, Prisma, UserRole, UserStatus } from '@prisma/client';

/**
 * The ONLY field set the admin user endpoints may project.
 *
 * Explicit on purpose: spreading the raw row (or using `include`) would expose
 * the credential and OTP columns and the refresh-token relation. Never widen
 * this without a contract change.
 */
export const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  status: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type AdminUserRow = Prisma.UserGetPayload<{ select: typeof ADMIN_USER_SELECT }>;

export interface AdminUserFilters {
  role?: UserRole;
  status?: UserStatus;
  q?: string;
  page: number;
  limit: number;
}

export interface AdminUserPage {
  items: AdminUserRow[];
  total: number;
}

export interface AdminUserUpdateData {
  role?: UserRole;
  status?: UserStatus;
}

/**
 * Escape LIKE metacharacters. Prisma's `contains` passes the value into a
 * `LIKE '%…%'` pattern without escaping, so an unescaped `%` from the query
 * string would match every row.
 */
const likeValue = (value: string): string => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/**
 * Build the `where` clause for the admin list.
 *
 * `q` matches email, first name, last name or phone. MySQL's default
 * `utf8mb4_..._ci` collation makes `contains` case-insensitive; Prisma rejects
 * `mode: 'insensitive'` for the mysql provider, so the collation is the
 * mechanism. Multi-word input is split into tokens that must ALL match
 * somewhere, which is what makes a full-name search ("Minh Anh") work across
 * the two name columns.
 */
const buildAdminUserWhere = (filters: AdminUserFilters): Prisma.UserWhereInput => {
  const where: Prisma.UserWhereInput = {};

  if (filters.role) where.role = filters.role;
  if (filters.status) where.status = filters.status;

  const q = filters.q?.trim();
  if (q) {
    const tokens = q.split(/\s+/).filter(Boolean).map(likeValue);
    where.AND = tokens.map<Prisma.UserWhereInput>((token) => ({
      OR: [
        { email: { contains: token } },
        { firstName: { contains: token } },
        { lastName: { contains: token } },
        { phone: { contains: token } },
      ],
    }));
  }

  return where;
};

export class UserRepository {
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { phone },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }

  async count(): Promise<number> {
    return prisma.user.count();
  }

  /**
   * Paginated admin user list. Projects `ADMIN_USER_SELECT` only, so no
   * credential column can reach the controller.
   */
  async findAdminUsers(filters: AdminUserFilters): Promise<AdminUserPage> {
    const where = buildAdminUserWhere(filters);

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: ADMIN_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  /** Admin-safe single lookup (no credential columns). */
  async findAdminUserById(id: string): Promise<AdminUserRow | null> {
    return prisma.user.findUnique({
      where: { id },
      select: ADMIN_USER_SELECT,
    });
  }

  /**
   * Count ACTIVE admins, optionally ignoring one row. Used by the last-admin
   * guard so a demotion/deactivation of the final ACTIVE ADMIN is refused.
   */
  async countActiveAdmins(excludeId?: string): Promise<number> {
    return prisma.user.count({
      where: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  /** Update role/status and return the admin-safe projection. */
  async updateAdminUser(id: string, data: AdminUserUpdateData): Promise<AdminUserRow> {
    return prisma.user.update({
      where: { id },
      data,
      select: ADMIN_USER_SELECT,
    });
  }
}
