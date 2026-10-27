import { prisma } from '@vexeviet/database';
import { AuditLog, AuditSeverity, Prisma } from '@prisma/client';
import { AuditLogItem } from '../types';

export interface AuditLogFilters {
  actor?: string;
  /** An unknown value must yield an empty page, not an error — see `findAll`. */
  severity?: string;
  action?: string;
  target?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface AuditLogPage {
  items: AuditLogItem[];
  total: number;
}

const SEVERITIES = new Set<string>(Object.values(AuditSeverity));

/**
 * Escape LIKE metacharacters. Prisma's `contains` does not escape them for
 * MySQL, so a bare `%` in a filter would otherwise match every row.
 */
const likeValue = (value: string): string => value.replace(/[\\%_]/g, (char) => `\\${char}`);

const buildAuditLogWhere = (filters: AuditLogFilters): Prisma.AuditLogWhereInput => {
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
  /** Newest first, always. Unmatched filters yield an empty page, not an error. */
  async findAll(filters: AuditLogFilters): Promise<AuditLogPage> {
    // Contract Shape 5: an unknown severity/action is not a 400. Bail out with
    // an empty page before touching the DB so an invalid enum never reaches
    // Prisma (which would throw).
    if (filters.severity && !SEVERITIES.has(filters.severity)) {
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
}

export const auditLogRepository = new AuditLogRepository();
