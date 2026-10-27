import type { AuditSeverity, Prisma } from '@prisma/client';
import { prisma } from './index';

/**
 * Input for a single admin audit-log row.
 *
 * `actorName` / `actorRole` are snapshots taken at write time: the row must stay
 * readable even after the actor is renamed, suspended or deleted.
 */
export interface AuditWriteInput {
  actorId?: string | null;
  actorName: string;
  /** Known values: 'ADMIN' | 'OPERATOR' | 'CUSTOMER' | 'SYSTEM'. */
  actorRole: string;
  action: string;
  target: string;
  targetId?: string | null;
  severity?: AuditSeverity;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

// Column widths from the Prisma model (`AuditLog`). Kept here so an oversized
// value is clipped locally instead of throwing P2000 on insert.
const MAX_ACTOR_NAME = 160;
const MAX_ACTOR_ROLE = 20;
const MAX_ACTION = 100;
const MAX_TARGET = 160;

const clip = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max) : value;

/**
 * Append one row to the shared `audit_logs` table.
 *
 * Invariants (acceptance criteria for the admin-backend contract):
 * - **Never throws.** Failures are caught and logged with `console.error`. An
 *   audit failure must never roll back or fail a business operation.
 * - Clips `actorName` / `actorRole` / `action` / `target` to their column widths
 *   so an oversized string cannot raise P2000 and be swallowed silently.
 * - Uses the shared `prisma` singleton from `./index`, never a new client.
 * - Defaults `severity` to `INFO`.
 *
 * Callers may `void writeAuditLog(...)`; awaiting is optional.
 */
export async function writeAuditLog(input: AuditWriteInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorName: clip(input.actorName, MAX_ACTOR_NAME),
        actorRole: clip(input.actorRole, MAX_ACTOR_ROLE),
        action: clip(input.action, MAX_ACTION),
        target: clip(input.target, MAX_TARGET),
        targetId: input.targetId ?? null,
        severity: input.severity ?? 'INFO',
        metadata: input.metadata,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error('[audit] failed to write audit log', {
      action: input.action,
      target: input.target,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
