import { prisma, BookingSeat, SeatStatus } from '@vexeviet/database';
import type {
  AdminSeatBlockResult,
  AdminSeatSkipItem,
  AdminSeatUnblockResult,
} from '../types';

export class SeatRepository {
  /**
   * Find seats by route and departure date
   */
  async findByRouteAndDate(
    routeId: string,
    departureDate: Date
  ): Promise<BookingSeat[]> {
    // Validate UUID format before querying Prisma to avoid P2023 error (400 Bad Request)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(routeId)) {
      return [];
    }

    // Normalize date to start of day (UTC) for consistent comparison
    const normalizedDate = new Date(departureDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    
    return prisma.bookingSeat.findMany({
      where: {
        routeId,
        departureDate: normalizedDate,
      },
    });
  }

  /**
   * Find specific seats by route, date, and seat numbers
   */
  async findSeats(
    routeId: string,
    departureDate: Date,
    seatNumbers: string[]
  ): Promise<BookingSeat[]> {
    return prisma.bookingSeat.findMany({
      where: {
        routeId,
        departureDate,
        seatNumber: { in: seatNumbers },
      },
    });
  }

  /**
   * Check if seats are available (not held, booked, or maintenance-blocked)
   *
   * `BLOCKED` is unconditional — it is not gated on `lockedUntil`. An admin
   * maintenance block is scoped to the departure date itself (its `lockedUntil`
   * is that date's 23:59:59.999Z), so gating on the clock would silently start
   * selling the seat after midnight even while the row still says BLOCKED.
   */
  async checkAvailability(
    routeId: string,
    departureDate: Date,
    seatNumbers: string[]
  ): Promise<{ available: boolean; unavailableSeats: string[] }> {
    const normalizedDate = new Date(departureDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const existingSeats = await prisma.bookingSeat.findMany({
      where: {
        routeId,
        departureDate: normalizedDate,
        seatNumber: { in: seatNumbers },
        OR: [
          { status: SeatStatus.BOOKED },
          { status: SeatStatus.BLOCKED },
          {
            status: SeatStatus.HELD,
            lockedUntil: { gt: new Date() },
          },
        ],
      },
      select: {
        seatNumber: true,
        status: true,
      },
    });

    const unavailableSeats = existingSeats.map(s => s.seatNumber);
    return {
      available: unavailableSeats.length === 0,
      unavailableSeats,
    };
  }

  /**
   * Hold seats with pessimistic locking using transaction
   */
  async holdSeats(
    routeId: string,
    departureDate: Date,
    seatNumbers: string[],
    holdId: string,
    ttlSeconds: number = 900
  ): Promise<BookingSeat[]> {
    // Validate UUID format before querying Prisma to avoid P2023 error (400 Bad Request)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(routeId)) {
      throw new Error(`Invalid Route ID format: ${routeId}`);
    }

    const lockedUntil = new Date(Date.now() + ttlSeconds * 1000);
    
    // Normalize date to start of day (UTC) for consistent comparison
    const normalizedDate = new Date(departureDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    
    // Use raw query for pessimistic locking
    return prisma.$transaction(async (tx) => {
      // First, check and lock the rows
      const existingSeats = await tx.bookingSeat.findMany({
        where: {
          routeId,
          departureDate: normalizedDate,
          seatNumber: { in: seatNumbers },
        },
      });

      // Check for conflicts (booked, maintenance-blocked, or held by another holdId/booking)
      //
      // `BLOCKED` is a conflict unconditionally — not gated on `lockedUntil`:
      // the block's timestamp is the scope of the service date, not a deadline.
      //
      // Isolation note (MySQL default REPEATABLE READ): this scan is a plain
      // non-locking read, so it sees the transaction's snapshot and cannot
      // observe a block committed after the snapshot was taken. The scan alone
      // is therefore *not* sufficient to protect a concurrent block — the
      // guarded write below is what actually arbitrates, because `UPDATE ...
      // WHERE status <> 'BLOCKED'` performs InnoDB's current read and blocks on
      // any row lock the concurrent block holds. This scan exists for the fast,
      // clear 409 before any row is touched; correctness does not depend on it.
      const conflicts = existingSeats.filter(
        seat =>
          seat.status === SeatStatus.BOOKED ||
          seat.status === SeatStatus.BLOCKED ||
          (seat.status === SeatStatus.HELD &&
            seat.holdId !== holdId &&
            seat.lockedUntil > new Date())
      );

      if (conflicts.length > 0) {
        throw this.seatsUnavailableError(conflicts.map(s => s.seatNumber));
      }

      // Write the holds.
      //
      // This is deliberately **not** a blind `upsert`. Prisma's `upsert` cannot
      // express a condition on its `update` branch, so a block committed between
      // the scan above and the write would be silently rewritten to HELD (the
      // exact bug this task exists to fix). Instead:
      //   - a seat with no existing row is `create`d, and a concurrent insert
      //     makes that fail with P2002, aborting the transaction;
      //   - an existing row is updated with `status: { not: BLOCKED }` in the
      //     WHERE, so InnoDB's current-read at write time is the authority. If
      //     the block landed in between, 0 rows match and we throw 409.
      // See the isolation note above the conflict check for what this does and
      // does not rely on.
      const results: BookingSeat[] = [];
      const existingBySeatNumber = new Map(existingSeats.map(seat => [seat.seatNumber, seat]));

      for (const seatNumber of seatNumbers) {
        const existing = existingBySeatNumber.get(seatNumber);
        const holdData = {
          holdId,
          bookingId: null, // Clear bookingId when re-holding
          status: SeatStatus.HELD,
          lockedAt: new Date(),
          lockedUntil,
        };

        if (!existing) {
          results.push(
            await tx.bookingSeat.create({
              data: {
                ...holdData,
                routeId,
                departureDate: normalizedDate,
                seatNumber,
              },
            })
          );
          continue;
        }

        const updated = await tx.bookingSeat.updateMany({
          where: {
            id: existing.id,
            status: { not: SeatStatus.BLOCKED },
          },
          data: holdData,
        });

        if (updated.count === 0) {
          // The row became BLOCKED after the conflict scan. Abort the whole
          // transaction so no partial hold is left behind.
          throw this.seatsUnavailableError([seatNumber]);
        }

        results.push(await tx.bookingSeat.findUniqueOrThrow({ where: { id: existing.id } }));
      }

      return results;
    });
  }

  /**
   * Confirm seats (change status from HELD to BOOKED)
   * Links the held seats to the actual booking
   */
  async confirmSeats(holdId: string, bookingId: string): Promise<number> {
    const result = await prisma.bookingSeat.updateMany({
      where: {
        holdId,
        status: SeatStatus.HELD,
      },
      data: {
        bookingId,
        status: SeatStatus.BOOKED,
      },
    });
    return result.count;
  }

  /**
   * Confirm seats by booking ID (change status from HELD to BOOKED)
   * Used when confirming payment for an existing booking
   */
  async confirmSeatsByBookingId(bookingId: string): Promise<number> {
    const result = await prisma.bookingSeat.updateMany({
      where: {
        bookingId,
        status: SeatStatus.HELD,
      },
      data: {
        status: SeatStatus.BOOKED,
      },
    });
    return result.count;
  }

  /**
   * Release seats by holdId (for held seats not yet booked)
   */
  async releaseSeats(holdId: string): Promise<number> {
    const result = await prisma.bookingSeat.deleteMany({
      where: {
        holdId,
        status: SeatStatus.HELD,
      },
    });
    return result.count;
  }

  /**
   * Release seats by bookingId (for booked seats - when cancelling booking)
   */
  async releaseSeatsByBookingId(bookingId: string): Promise<number> {
    const result = await prisma.bookingSeat.deleteMany({
      where: {
        bookingId,
        status: { in: [SeatStatus.HELD, SeatStatus.BOOKED] },
      },
    });
    return result.count;
  }

  /**
   * Release expired held seats (cleanup job)
   */
  async releaseExpiredHolds(): Promise<number> {
    const result = await prisma.bookingSeat.deleteMany({
      where: {
        status: SeatStatus.HELD,
        lockedUntil: { lt: new Date() },
      },
    });
    return result.count;
  }

  /**
   * Get seat availability summary for a route/date
   */
  async getAvailabilitySummary(
    routeId: string,
    departureDate: Date,
    totalSeats: number
  ): Promise<{
    totalSeats: number;
    bookedSeats: number;
    heldSeats: number;
    availableSeats: number;
  }> {
    const seats = await prisma.bookingSeat.groupBy({
      by: ['status'],
      where: {
        routeId,
        departureDate,
        OR: [
          { status: SeatStatus.BOOKED },
          {
            status: SeatStatus.HELD,
            lockedUntil: { gt: new Date() },
          },
        ],
      },
      _count: {
        status: true,
      },
    });

    const bookedSeats =
      seats.find(s => s.status === SeatStatus.BOOKED)?._count.status || 0;
    const heldSeats =
      seats.find(s => s.status === SeatStatus.HELD)?._count.status || 0;

    return {
      totalSeats,
      bookedSeats,
      heldSeats,
      availableSeats: totalSeats - bookedSeats - heldSeats,
    };
  }

  /**
   * Build the existing `409 / SEATS_UNAVAILABLE / details.unavailableSeats`
   * shape the rest of the hold path uses. Kept here so both the conflict scan
   * and the guarded write report the same error.
   */
  private seatsUnavailableError(unavailableSeats: string[]): Error & {
    statusCode: number;
    code: string;
    details: { unavailableSeats: string[] };
  } {
    const error = new Error(`Seats unavailable: ${unavailableSeats.join(', ')}`) as Error & {
      statusCode: number;
      code: string;
      details: { unavailableSeats: string[] };
    };
    error.statusCode = 409;
    error.code = 'SEATS_UNAVAILABLE';
    error.details = { unavailableSeats };
    return error;
  }

  /**
   * End of the service date, as the value stored in `BookingSeat.lockedUntil`
   * for a maintenance block.
   *
   * `lockedUntil` is non-nullable and there is no migration in scope, so the
   * column is reused as the *scope* of the block rather than a hold deadline:
   * 23:59:59.999Z of the `@db.Date` departure date. The block is honoured
   * unconditionally (`status = BLOCKED`), and every expiry/cleanup predicate in
   * this repository excludes BLOCKED, so this timestamp is never read as
   * "how long the block lasts". See the handoff for why that is safe.
   */
  private static blockExpiry(departureDate: Date): Date {
    const endOfServiceDate = new Date(departureDate);
    endOfServiceDate.setUTCHours(23, 59, 59, 999);
    return endOfServiceDate;
  }

  /**
   * Mark seats as maintenance-blocked for one route/date.
   *
   * Per-seat outcomes: a seat that is not in the bus template is reported
   * `SEAT_NOT_FOUND`, and a seat currently HELD (live) or BOOKED is reported as
   * skipped rather than stolen — an admin block must never overwrite a sale or
   * a customer's in-flight hold.
   *
   * Runs in one transaction so a batch either applies coherently or (on an
   * unexpected failure) does not half-apply. `updateMany` re-checks the status
   * at write time: between the read and the write a hold could have landed, in
   * which case 0 rows match and the seat is reported skipped instead of
   * clobbering the hold.
   *
   * `validSeatNumbers` is the caller's template lookup; this method does not
   * reach into `Seat` itself so the service keeps ownership of route/template
   * resolution.
   */
  async blockSeats(
    routeId: string,
    departureDate: Date,
    seatNumbers: string[],
    validSeatNumbers: ReadonlySet<string>
  ): Promise<AdminSeatBlockResult> {
    const normalizedDate = new Date(departureDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    const lockedUntil = SeatRepository.blockExpiry(normalizedDate);
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

        const existing = existingBySeatNumber.get(seatNumber);

        if (existing?.status === SeatStatus.BOOKED) {
          skipped.push({
            seatNumber,
            code: 'SEAT_BOOKED',
            message: `Seat '${seatNumber}' is booked and cannot be blocked`,
          });
          continue;
        }

        if (
          existing?.status === SeatStatus.HELD &&
          existing.lockedUntil > now
        ) {
          skipped.push({
            seatNumber,
            code: 'SEAT_HELD',
            message: `Seat '${seatNumber}' is currently held by a customer`,
          });
          continue;
        }

        if (existing?.status === SeatStatus.BLOCKED) {
          // Already blocked with the same scope: reporting it as blocked keeps
          // the endpoint idempotent for a double-click, and the audit row still
          // records what the admin asked for.
          blocked.push(seatNumber);
          continue;
        }

        const blockData = {
          status: SeatStatus.BLOCKED,
          // A block belongs to no customer and no hold.
          holdId: null,
          bookingId: null,
          lockedAt: now,
          // Reused as the block's scope, not a deadline — see blockExpiry().
          lockedUntil,
        };

        if (!existing) {
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
        }

        // Guard the write: only an AVAILABLE row or an expired HELD row may
        // become BLOCKED. A live HELD/BOOKED that landed after the read above
        // matches 0 rows and is reported as skipped.
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
          // A hold or sale committed between the read above and this write.
          // The new state is not readable here: this transaction's snapshot
          // predates it, so classify honestly as "changed concurrently" rather
          // than guessing HELD or BOOKED.
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
   * Remove a maintenance block from seats for one route/date.
   *
   * Only rows that are currently `BLOCKED` are touched. Anything else — a held
   * seat, a sold seat, or a seat that was never blocked — is reported as
   * skipped and left alone, so this is idempotent: unblocking an unblocked seat
   * is a per-item no-op (`NOT_BLOCKED`), not a 4xx for the request.
   *
   * The blocked rows are **deleted**, not set to AVAILABLE: nothing in this
   * codebase reads an AVAILABLE `BookingSeat` row (availability is the absence
   * of a conflicting row), and the brief forbids writing AVAILABLE rows.
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

        // `status: BLOCKED` is part of the delete's WHERE. If the row was
        // somehow replaced between the read and the write, 0 rows go and the
        // seat is reported skipped rather than deleting a live hold.
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
