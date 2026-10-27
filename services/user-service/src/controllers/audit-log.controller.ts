import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { auditLogRepository } from '../repositories/audit-log.repository';
import { auditLogListQuerySchema } from '../validators/audit-log.validator';

/** First zod issue, rendered as `field: message`, matching user-service's flat errors. */
const formatZodIssues = (issues: { path: (string | number)[]; message: string }[]): string => {
  const first = issues[0];
  if (!first) return 'Validation failed';
  const field = first.path.join('.');
  return field ? `${field}: ${first.message}` : first.message;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turn a validated `from`/`to` filter into an instant.
 *
 * A date-only `to` (e.g. `2026-10-27`) is inclusive through the end of that UTC
 * day rather than collapsing to 00:00, otherwise a same-day range would return
 * nothing. Full ISO timestamps are used verbatim.
 */
const parseBound = (value: string, endOfDay: boolean): Date => {
  if (!DATE_ONLY.test(value)) return new Date(value);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date;
};

export class AuditLogController {
  /**
   * GET /api/v1/audit-logs (ADMIN)
   * Contract Shape 5 — newest first, severity lowercased in the response.
   * Unmatched filters return an empty page rather than an error.
   */
  listAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = auditLogListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: formatZodIssues(parsed.error.issues),
      });
      return;
    }

    const query = parsed.data;

    try {
      const { items, total } = await auditLogRepository.findAll({
        actor: query.actor,
        severity: query.severity,
        action: query.action,
        target: query.target,
        from: query.from ? parseBound(query.from, false) : undefined,
        to: query.to ? parseBound(query.to, true) : undefined,
        page: query.page,
        limit: query.limit,
      });

      res.status(200).json({
        success: true,
        data: items,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list audit logs',
      });
    }
  };
}

export const auditLogController = new AuditLogController();
