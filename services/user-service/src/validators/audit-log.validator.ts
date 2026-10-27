import { z } from 'zod';

/**
 * Audit log list query.
 *
 * `severity` and `action` are deliberately NOT enum-validated: contract Shape 5
 * requires an unknown filter value to produce an empty page, not a 400. The
 * repository is what turns an unknown severity into an empty result.
 *
 * `from`/`to` accept anything `Date.parse` understands (date-only and full ISO
 * with or without an offset), and are rejected only when unparseable.
 */
const dateString = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'must be a valid date (ISO 8601)',
  });

export const auditLogListQuerySchema = z.object({
  actor: z.string().trim().max(160, 'actor must not exceed 160 characters').optional(),
  severity: z
    .string()
    .trim()
    .max(20, 'severity must not exceed 20 characters')
    .transform((value) => value.toUpperCase())
    .optional(),
  action: z.string().trim().max(100, 'action must not exceed 100 characters').optional(),
  target: z.string().trim().max(160, 'target must not exceed 160 characters').optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  page: z.coerce.number().int().min(1, 'page must be >= 1').default(1),
  limit: z.coerce.number().int().min(1, 'limit must be >= 1').max(100, 'limit must be <= 100').default(20),
});

/**
 * Audit log export query: the same filters as the list, without `page`/`limit`.
 *
 * Derived from the list schema so the two can never drift. Paging is
 * meaningless for a file download; the row cap is applied by the controller.
 */
export const auditLogExportQuerySchema = auditLogListQuerySchema.omit({
  page: true,
  limit: true,
});

export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
export type AuditLogExportQuery = z.infer<typeof auditLogExportQuerySchema>;
