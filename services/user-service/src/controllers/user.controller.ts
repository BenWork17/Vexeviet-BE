import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { UserService, UserServiceError } from '../services/user.service';
import { User } from '../types';
import { adminUserListQuerySchema, adminUserUpdateSchema } from '../validators/admin-user.validator';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: string): boolean => UUID_PATTERN.test(value);

/** First zod issue, rendered as `field: message`, matching user-service's flat errors. */
const formatZodIssues = (issues: { path: (string | number)[]; message: string }[]): string => {
  const first = issues[0];
  if (!first) return 'Validation failed';
  const field = first.path.join('.');
  return field ? `${field}: ${first.message}` : first.message;
};

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const user = await this.userService.getUserById(userId);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'User not found',
      });
    }
  };

  updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const updates = req.body as Partial<User>;
      const user = await this.userService.updateUser(userId, updates);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      });
    }
  };

  deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      await this.userService.deleteUser(userId);
      res.status(200).json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      });
    }
  };

  /**
   * GET /api/v1/users/admin/all (ADMIN)
   * Contract Shape 4 list — explicit projection, never credential columns.
   */
  listAdminUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = adminUserListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: formatZodIssues(parsed.error.issues),
      });
      return;
    }

    try {
      const result = await this.userService.listAdminUsers(parsed.data);
      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list users',
      });
    }
  };

  /**
   * PATCH /api/v1/users/admin/:id (ADMIN)
   * Body `{ role?, status? }` — at least one. 400 own role/status change,
   * 409 last active admin, 404 unknown id, 400 malformed uuid.
   */
  updateAdminUser = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id || !isUuid(id)) {
      res.status(400).json({
        success: false,
        error: 'id must be a valid uuid',
      });
      return;
    }

    const parsed = adminUserUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: formatZodIssues(parsed.error.issues),
      });
      return;
    }

    try {
      const user = await this.userService.updateAdminUser(id, parsed.data, {
        userId: req.user!.userId,
        email: req.user!.email,
      });
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      if (error instanceof UserServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
      });
    }
  };

  /**
   * POST /api/v1/users/admin/:id/resend-verification (ADMIN)
   * Email-only re-send for an unverified user. 404 unknown id, 400 malformed
   * uuid, 409 when no method / phone-only / already verified / no email,
   * 502 when the mail send fails.
   */
  resendVerification = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id || !isUuid(id)) {
      res.status(400).json({
        success: false,
        error: 'id must be a valid uuid',
      });
      return;
    }

    try {
      const result = await this.userService.resendVerification(id, {
        userId: req.user!.userId,
        email: req.user!.email,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof UserServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send verification code',
      });
    }
  };
}
