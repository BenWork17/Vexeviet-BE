import { Prisma, prisma, BookingSeat, SeatStatus } from '@vexeviet/database';
import type {
  AdminSeatBlockResult,
  AdminSeatSkipItem,
  AdminSeatUnblockResult,
} from '../types';

/**
 * Verdict for a `BookingSeat` row that already exists, decided from its status
 * alone. An AVAILABLE row or an expired HELD row `proceed` to the guarded
 * write; if that write loses the race it reports `SEAT_STATE_CHANGED` there,
 * because only the write itself can see the outcome.
 */
type SeatBlockOutcome =
  | { kind: 'blocked' }
  | { kind: 'proceed' }
  | { kind: 'skipped'; skip: AdminSeatSkipItem };

export class SeatAdminRepository {
  /**
   * End of the service date stored in `BookingSeat.lockedUntil` for a
   * maintenance block (scope of the block, not a hold deadline).
   */
  private static blockExpiry(departureDate: Date): Date {
    const endOfServiceDate = new Date(departureDate);
    endOfServiceDate.setUTCHours(23, 59, 59, 999);
    return endOfServiceDate;
  }

  /**
   * Duck-typed check for Prisma's P2002 ("unique constraint failed").
   */
  private static isUniqueConstraintViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }

  /**
   * Fetch one booking seat as a current locking read (`FOR UPDATE`) so rows
   * committed after this transaction's REPEATABLE READ snapshot are visible.
   */
  private static async findSeatForUpdate(
    tx: Prisma.TransactionClient,
    routeId: string,
    departureDate: Date,
    seatNumber: string
  ): Promise<BookingSeat | null> {
    const departureDay = departureDate.toISOString().slice(0, 10);
    const rows = await tx.$queryRaw<BookingSeat[]>`
      SELECT id, bookingId, holdId, routeId, seatId, departureDate, seatNumber,
             status, lockedAt, lockedUntil, price, createdAt
      FROM booking_seats
      WHERE routeId = ${routeId}
        AND seatNumber = ${seatNumber}
        AND departureDate = ${departureDay}
      LIMIT 1
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  /**
   * Classify an existing `BookingSeat` row for `blockSeats`.
   */
  private static classifyForBlock(
    seatNumber: string,
    existing: BookingSeat,
    now: Date
  ): SeatBlockOutcome {
    if (existing.status === SeatStatus.BOOKED) {
      return {
        kind: 'skipped',
        skip: {
          seatNumber,
          code: 'SEAT_BOOKED',
          message: `Seat '${seatNumber}' is booked and cannot be blocked`,
        },
      };
    }

    if (existing.status === SeatStatus.HELD && existing.lockedUntil > now) {
      return {
        kind: 'skipped',
        skip: {
          seatNumber,
          code: 'SEAT_HELD',
          message: `Seat '${seatNumber}' is currently held by a customer`,
        },
      };
    }

    if (existing.status === SeatStatus.BLOCKED) {
      return { kind: 'blocked' };
    }

    return { kind: 'proceed' };
  }

  /**
   * Mark seats as maintenance-blocked for one route/date without overwriting
   * live customer holds or confirmed bookings.
   */
  async blockSeats(
    routeId: string,
    departureDate: Date,
    seatNumbers: string[],
    validSeatNumbers: ReadonlySet<string>
  ): Promise<AdminSeatBlockResult> {
    const normalizedDate = new Date(departureDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    const lockedUntil = SeatAdminRepository.blockExpiry(normalizedDate);
    const now = new Date();

    return prisma.$transaction(async tx => {
      const existingSeats = await tx.bookingSeat.findMany({
        where: {
          routeId,
          departureDate: normalizedDate,
          seatNumber: { in: seatNumbers },
        },
      });
      const existingBySeatNumber = new Map(existingSeats.map(seat => [seat.seatNumber, seat]));

      const blocked: string[] = [];
      const skipped: AdminSeatSkipItem[] = [];

      for (const seatNumber of seatNumbers) {
        if (!validSeatNumbers.has(seatNumber)) {
          skipped.push({
            seatNumber,
            code: 'SEAT_NOT_FOUND',
            message: `Seat '${seatNumber}' does not exist in this route's bus template`,
          });
          continue;
        }

        let existing = existingBySeatNumber.get(seatNumber);

        if (existing) {
          const outcome = SeatAdminRepository.classifyForBlock(seatNumber, existing, now);

          if (outcome.kind === 'blocked') {
            blocked.push(seatNumber);
            continue;
          }
          if (outcome.kind === 'skipped') {
            skipped.push(outcome.skip);
            continue;
          }
        }

        const blockData = {
          status: SeatStatus.BLOCKED,
          holdId: null,
          bookingId: null,
          lockedAt: now,
          lockedUntil,
        };

        if (!existing) {
          try {
            await tx.bookingSeat.create({
              data: {
                ...blockData,
                routeId,
                departureDate: normalizedDate,
                seatNumber,
              },
            });
            blocked.push(seatNumber);
            continue;
          } catch (error) {
            if (!SeatAdminRepository.isUniqueConstraintViolation(error)) {
              throw error;
            }
          }

          const raced = await SeatAdminRepository.findSeatForUpdate(
            tx,
            routeId,
            normalizedDate,
            seatNumber
          );

          if (!raced) {
            skipped.push({
              seatNumber,
              code: 'SEAT_STATE_CHANGED',
              message: `Seat '${seatNumber}' changed state while being blocked; retry`,
            });
            continue;
          }

          const outcome = SeatAdminRepository.classifyForBlock(seatNumber, raced, now);

          if (outcome.kind === 'blocked') {
            blocked.push(seatNumber);
            continue;
          }
          if (outcome.kind === 'skipped') {
            skipped.push(outcome.skip);
            continue;
          }
          existing = raced;
        }

        const updated = await tx.bookingSeat.updateMany({
          where: {
            id: existing.id,
            OR: [
              { status: SeatStatus.AVAILABLE },
              { status: SeatStatus.HELD, lockedUntil: { lte: now } },
            ],
          },
          data: blockData,
        });

        if (updated.count === 0) {
          skipped.push({
            seatNumber,
            code: 'SEAT_STATE_CHANGED',
            message: `Seat '${seatNumber}' changed state while being blocked; retry`,
          });
          continue;
        }

        blocked.push(seatNumber);
      }

      return { blocked, skipped };
    });
  }

  /**
   * Remove maintenance blocks from seats for one route/date.
   */
  async unblockSeats(
    routeId: string,
    departureDate: Date,
    seatNumbers: string[]
  ): Promise<AdminSeatUnblockResult> {
    const normalizedDate = new Date(departureDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    return prisma.$transaction(async tx => {
      const blockedSeats = await tx.bookingSeat.findMany({
        where: {
          routeId,
          departureDate: normalizedDate,
          seatNumber: { in: seatNumbers },
          status: SeatStatus.BLOCKED,
        },
        select: { id: true, seatNumber: true },
      });
      const blockedBySeatNumber = new Map(blockedSeats.map(seat => [seat.seatNumber, seat]));

      const unblocked: string[] = [];
      const skipped: AdminSeatSkipItem[] = [];

      for (const seatNumber of seatNumbers) {
        const row = blockedBySeatNumber.get(seatNumber);

        if (!row) {
          skipped.push({
            seatNumber,
            code: 'NOT_BLOCKED',
            message: `Seat '${seatNumber}' has no maintenance block`,
          });
          continue;
        }

        const deleted = await tx.bookingSeat.deleteMany({
          where: {
            id: row.id,
            status: SeatStatus.BLOCKED,
          },
        });

        if (deleted.count === 0) {
          skipped.push({
            seatNumber,
            code: 'NOT_BLOCKED',
            message: `Seat '${seatNumber}' has no maintenance block`,
          });
          continue;
        }

        unblocked.push(seatNumber);
      }

      return { unblocked, skipped };
    });
  }
}
