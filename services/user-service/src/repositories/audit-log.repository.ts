import { prisma } from '@vexeviet/database';
import { AuditLog, AuditSeverity, Prisma } from '@prisma/client';
import { AuditLogItem } from '../types';

/** Filters that narrow the `where` clause, shared by the page and export reads. */
export interface AuditLogWhereFilters {
  actor?: string;
  /** An unknown value must yield an empty result, not an error — see `findAll`. */
  severity?: string;
  action?: string;
  target?: string;
  from?: Date;
  to?: Date;
}

export interface AuditLogFilters extends AuditLogWhereFilters {
  page: number;
  limit: number;
}

export interface AuditLogPage {
  items: AuditLogItem[];
  total: number;
}

export interface AuditLogExport {
  items: AuditLogItem[];
  /** True when the read hit `maxRows` and older rows were left out. */
  truncated: boolean;
}

const SEVERITIES = new Set<string>(Object.values(AuditSeverity));

/**
 * Escape LIKE metacharacters. Prisma's `contains` does not escape them for
 * MySQL, so a bare `%` in a filter would otherwise match every row.
 */
const likeValue = (value: string): string => value.replace(/[\\%_]/g, (char) => `\\${char}`);

const buildAuditLogWhere = (filters: AuditLogWhereFilters): Prisma.AuditLogWhereInput => {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.actor) {
    const value = likeValue(filters.actor);
    where.OR = [{ actorId: { contains: value } }, { actorName: { contains: value } }];
  }
  if (filters.severity) where.severity = filters.severity as AuditSeverity;
  if (filters.action) where.action = filters.action;
  if (filters.target) where.target = { contains: likeValue(filters.target) };

  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  return where;
};

/**
 * The DB enum is uppercase; the admin UI compares against lowercase literals,
 * so the conversion lives here and nowhere else.
 */
const toSeverity = (severity: AuditSeverity): AuditLogItem['severity'] => {
  switch (severity) {
    case AuditSeverity.DANGER:
      return 'danger';
    case AuditSeverity.WARNING:
      return 'warning';
    case AuditSeverity.INFO:
    default:
      return 'info';
  }
};

const toAuditLogItem = (row: AuditLog): AuditLogItem => ({
  id: row.id,
  actor: row.actorName,
  actorId: row.actorId,
  role: row.actorRole,
  action: row.action,
  target: row.target,
  severity: toSeverity(row.severity),
  metadata: row.metadata,
  createdAt: row.createdAt,
});

export class AuditLogRepository {
  /**
   * Contract Shape 5: an unknown severity is not a 400. Both reads share this
   * check so the export behaves exactly like the list — an unknown severity
   * yields the header row only, never a Prisma enum error.
   */
  private hasUnknownSeverity(filters: AuditLogWhereFilters): boolean {
    const { severity } = filters;
    return severity !== undefined && !SEVERITIES.has(severity);
  }

  /** Newest first, always. Unmatched filters yield an empty page, not an error. */
  async findAll(filters: AuditLogFilters): Promise<AuditLogPage> {
    if (this.hasUnknownSeverity(filters)) {
      return { items: [], total: 0 };
    }

    const where = buildAuditLogWhere(filters);

    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items: rows.map(toAuditLogItem), total };
  }

  /**
   * Bounded export read behind `GET /audit-logs/export`.
   *
   * Same filters and same ordering as `findAll`, but no paging: one `findMany`
   * with `take: maxRows + 1`. The extra row is the truncation signal, so no
   * second `count` query is needed. A bounded read (not a server-side cursor)
   * is deliberate — the service caps the file at 10k rows.
   */
  async findAllForExport(
    filters: AuditLogWhereFilters,
    maxRows: number
  ): Promise<AuditLogExport> {
    if (this.hasUnknownSeverity(filters)) {
      return { items: [], truncated: false };
    }

    const where = buildAuditLogWhere(filters);

    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: maxRows + 1,
    });

    const truncated = rows.length > maxRows;
    const kept = truncated ? rows.slice(0, maxRows) : rows;

    return { items: kept.map(toAuditLogItem), truncated };
  }
}

export const auditLogRepository = new AuditLogRepository();
