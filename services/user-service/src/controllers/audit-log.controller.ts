import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { auditLogRepository } from '../repositories/audit-log.repository';
import { auditLogExportQuerySchema, auditLogListQuerySchema } from '../validators/audit-log.validator';
import { AuditLogItem } from '../types';

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

/** Hard cap on `GET /audit-logs/export` rows — a file download, not a pager. */
export const MAX_EXPORT_ROWS = 10000;

/** Spelled as an escape so the source file stays plain ASCII. */
const UTF8_BOM = '\uFEFF';

const CSV_COLUMNS = [
  'createdAt',
  'actor',
  'actorId',
  'role',
  'action',
  'target',
  'severity',
  'metadata',
] as const;

/**
 * Render one CSV field.
 *
 * RFC 4180: a field containing a comma, a double quote, CR or LF is wrapped in
 * double quotes, and any embedded double quote is doubled. Every field —
 * including the header row — goes through here so no cell can break the
 * record/field structure.
 */
export const csvCell = (value: string): string => {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const csvRow = (cells: readonly string[]): string => cells.map(csvCell).join(',');

/** ISO 8601 for dates, empty cell for a null `metadata`/`actorId`. */
const emptyIfNull = (value: string | null | undefined): string => value ?? '';

const toCsvRow = (item: AuditLogItem): string =>
  csvRow([
    item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
    emptyIfNull(item.actor),
    emptyIfNull(item.actorId),
    emptyIfNull(item.role),
    emptyIfNull(item.action),
    emptyIfNull(item.target),
    emptyIfNull(item.severity),
    item.metadata === null || item.metadata === undefined ? '' : JSON.stringify(item.metadata),
  ]);

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

  /**
   * GET /api/v1/audit-logs/export (ADMIN)
   *
   * Same filters as the list, `page`/`limit` ignored, hard cap of
   * `MAX_EXPORT_ROWS`. **Envelope exception:** the body is a file download, not
   * a JSON response, so the `{success, data}` contract does not apply here;
   * only genuine validation/DB failures fall back to the flat error envelope.
   *
   * Truncation is a 200 with `X-Export-Truncated: true` — the admin asked for
   * "everything", and a capped file with an explicit header is more useful than
   * a 4xx that hands them nothing.
   *
   * The body starts with a UTF-8 BOM so Excel opens Vietnamese text as UTF-8
   * instead of the ANSI code page (which would mojibake `Nguyễn`).
   */
  exportAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = auditLogExportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: formatZodIssues(parsed.error.issues),
      });
      return;
    }

    const query = parsed.data;

    try {
      const { items, truncated } = await auditLogRepository.findAllForExport(
        {
          actor: query.actor,
          severity: query.severity,
          action: query.action,
          target: query.target,
          from: query.from ? parseBound(query.from, false) : undefined,
          to: query.to ? parseBound(query.to, true) : undefined,
        },
        MAX_EXPORT_ROWS
      );

      const lines = [csvRow(CSV_COLUMNS), ...items.map(toCsvRow)];
      const body = `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
      const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

      // Headers before the body: once `res.send` runs the response is committed.
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Export-Row-Limit', String(MAX_EXPORT_ROWS));
      if (truncated) {
        res.setHeader('X-Export-Truncated', 'true');
      }
      // Exposed so the admin SPA can read the truncation signal cross-origin.
      res.setHeader(
        'Access-Control-Expose-Headers',
        'Content-Disposition, X-Export-Truncated, X-Export-Row-Limit'
      );

      res.status(200).send(body);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export audit logs',
      });
    }
  };
}

export const auditLogController = new AuditLogController();
