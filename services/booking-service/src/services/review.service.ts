import {
  BookingStatus,
  OperatorReview,
  Prisma,
  ReviewStatus,
  UserRole,
  writeAuditLog,
} from '@vexeviet/database';
import {
  BookingNotFoundError,
  NotFoundError,
  ReviewAlreadyExistsError,
  TripNotCompletedError,
} from '../middlewares/error.middleware';
import {
  BookingForReviewRow,
  MyReviewRow,
  RatingGroupRow,
  ReviewRepository,
  ReviewWithRelations,
} from '../repositories/review.repository';
import { PaginatedResponse, TokenPayload } from '../types';
import {
  CreateReviewInput,
  ManageReviewDto,
  ManageReviewStatsDto,
  ManageReviewsQuery,
  MyReviewDto,
  MyReviewsQuery,
  OperatorReviewSummaryDto,
  PublicOperatorReviewsQuery,
  PublicReviewDto,
  RatingDistribution,
  ReviewDto,
  ReviewEligibilityItem,
  ReviewEligibilityMap,
} from '../types/review.types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Mask reviewer full name for public display so PII is never exposed.
 * Examples:
 * - ("Nguyễn Văn", "A") -> "Nguyễn V*** A"
 * - ("Nguyễn", "An") -> "Nguyễn A***"
 * - ("An", "") -> "A***"
 */
export function maskReviewerName(firstName: string, lastName: string): string {
  const parts = `${firstName || ''} ${lastName || ''}`
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);

  if (parts.length === 0) {
    return 'Khách hàng';
  }

  if (parts.length === 1) {
    return `${parts[0][0]}***`;
  }

  if (parts.length === 2) {
    return `${parts[0]} ${parts[1][0]}***`;
  }

  const first = parts[0];
  const last = parts[parts.length - 1];
  const middle = parts.slice(1, -1).map((part) => `${part[0]}***`);
  return `${first} ${middle.join(' ')} ${last}`;
}

/**
 * Compute whether a booking's trip has finished / is eligible for review.
 * Eligible when:
 * - booking.status === COMPLETED, OR
 * - booking.status === CONFIRMED AND the scheduled trip end time has already passed.
 */
export function isTripCompletedForReview(
  booking: Pick<BookingForReviewRow, 'status' | 'departureDate' | 'route'>,
  now: Date = new Date()
): boolean {
  if (booking.status === BookingStatus.COMPLETED) {
    return true;
  }

  if (booking.status !== BookingStatus.CONFIRMED) {
    return false;
  }

  const depDate = booking.departureDate;
  const routeDep = booking.route.departureTime;
  const durationMinutes = booking.route.duration > 0 ? booking.route.duration : 0;

  const tripDeparture = new Date(
    Date.UTC(
      depDate.getUTCFullYear(),
      depDate.getUTCMonth(),
      depDate.getUTCDate(),
      routeDep.getUTCHours(),
      routeDep.getUTCMinutes(),
      routeDep.getUTCSeconds()
    )
  );
  const tripEnd = new Date(tripDeparture.getTime() + durationMinutes * 60_000);

  return now.getTime() >= tripEnd.getTime();
}

/**
 * Pure eligibility evaluator used by both POST /reviews and GET /reviews/eligibility.
 */
export function evaluateBookingEligibility(
  booking: BookingForReviewRow | undefined,
  userId: string,
  now: Date = new Date()
): ReviewEligibilityItem {
  if (!booking || booking.userId !== userId) {
    return {
      canReview: false,
      reason: 'NOT_OWNER',
      review: null,
    };
  }

  if (booking.review) {
    return {
      canReview: false,
      reason: 'ALREADY_REVIEWED',
      review: {
        id: booking.review.id,
        rating: booking.review.rating,
        comment: booking.review.comment,
        createdAt: booking.review.createdAt.toISOString(),
        operatorReply: booking.review.operatorReply,
        repliedAt: booking.review.repliedAt ? booking.review.repliedAt.toISOString() : null,
      },
    };
  }

  if (!isTripCompletedForReview(booking, now)) {
    return {
      canReview: false,
      reason: 'TRIP_NOT_COMPLETED',
      review: null,
    };
  }

  return {
    canReview: true,
    reason: null,
    review: null,
  };
}

/**
 * Aggregate rating counts into average (1 decimal place, 0 when empty) + 1..5 distribution.
 */
export function buildRatingSummary(
  operatorId: string | null,
  groups: RatingGroupRow[]
): OperatorReviewSummaryDto {
  const distribution: RatingDistribution = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  };

  let totalReviews = 0;
  let weightedSum = 0;

  for (const row of groups) {
    const key = String(row.rating) as keyof RatingDistribution;
    if (key in distribution) {
      const count = row._count.id;
      distribution[key] = count;
      totalReviews += count;
      weightedSum += row.rating * count;
    }
  }

  const averageRating =
    totalReviews > 0 ? Math.round((weightedSum / totalReviews) * 10) / 10 : 0;

  return {
    operatorId,
    averageRating,
    totalReviews,
    distribution,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

export class ReviewService {
  private readonly reviewRepo: ReviewRepository;

  constructor(reviewRepo: ReviewRepository = new ReviewRepository()) {
    this.reviewRepo = reviewRepo;
  }

  private toReviewDto(row: OperatorReview): ReviewDto {
    return {
      id: row.id,
      bookingId: row.bookingId,
      rating: row.rating,
      comment: row.comment,
      status: row.status,
      operatorId: row.operatorId,
      routeId: row.routeId,
      operatorReply: row.operatorReply,
      repliedAt: row.repliedAt ? row.repliedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toMyReviewDto(row: MyReviewRow): MyReviewDto {
    return {
      ...this.toReviewDto(row),
      route: row.route
        ? {
            fromCity: row.route.origin,
            toCity: row.route.destination,
            departureTime: row.route.departureTime.toISOString(),
          }
        : null,
    };
  }

  private toPublicReviewDto(row: ReviewWithRelations): PublicReviewDto {
    return {
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      reviewerName: maskReviewerName(row.user.firstName, row.user.lastName),
      createdAt: row.createdAt.toISOString(),
      route: row.route
        ? {
            fromCity: row.route.origin,
            toCity: row.route.destination,
          }
        : null,
      tripDate: row.booking.departureDate.toISOString().split('T')[0],
      verified: true,
      operatorReply: row.operatorReply,
      repliedAt: row.repliedAt ? row.repliedAt.toISOString() : null,
    };
  }

  private toManageReviewDto(row: ReviewWithRelations): ManageReviewDto {
    const fullName = `${row.user.firstName || ''} ${row.user.lastName || ''}`.trim() || 'Khách hàng';
    return {
      ...this.toPublicReviewDto(row),
      reviewerName: fullName,
      bookingId: row.bookingId,
      bookingCode: row.booking.bookingCode,
      status: row.status,
    };
  }

  /**
   * Customer creates a review for a completed/past-confirmed booking they own.
   * operatorId and routeId are derived strictly from the booking's route.
   */
  async createReview(
    userId: string,
    input: CreateReviewInput,
    now: Date = new Date()
  ): Promise<ReviewDto> {
    const booking = await this.reviewRepo.findBookingForReview(input.bookingId);

    if (!booking || booking.userId !== userId) {
      throw new BookingNotFoundError(input.bookingId);
    }

    if (booking.review) {
      throw new ReviewAlreadyExistsError(input.bookingId);
    }

    if (!isTripCompletedForReview(booking, now)) {
      throw new TripNotCompletedError();
    }

    const trimmedComment =
      typeof input.comment === 'string' && input.comment.trim().length > 0
        ? input.comment.trim()
        : null;

    try {
      const created = await this.reviewRepo.create({
        bookingId: booking.id,
        userId,
        operatorId: booking.route.operatorId,
        routeId: booking.routeId,
        rating: input.rating,
        comment: trimmedComment,
      });

      return this.toReviewDto(created);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ReviewAlreadyExistsError(input.bookingId);
      }
      throw error;
    }
  }

  /**
   * List authenticated customer's own reviews.
   */
  async getMyReviews(
    userId: string,
    query: MyReviewsQuery
  ): Promise<PaginatedResponse<MyReviewDto>> {
    const page = query.page || DEFAULT_PAGE;
    const limit = Math.min(query.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const { rows, total } = await this.reviewRepo.findByUserId(userId, skip, limit);

    return {
      data: rows.map((row) => this.toMyReviewDto(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Batch check review eligibility for up to 50 bookings owned by the user.
   */
  async getEligibility(
    userId: string,
    bookingIds: string[],
    now: Date = new Date()
  ): Promise<ReviewEligibilityMap> {
    const uniqueIds = Array.from(new Set(bookingIds));
    if (uniqueIds.length === 0) {
      return {};
    }

    const bookings = await this.reviewRepo.findBookingsForEligibility(uniqueIds);
    const bookingMap = new Map<string, BookingForReviewRow>();
    for (const b of bookings) {
      bookingMap.set(b.id, b);
    }

    const result: ReviewEligibilityMap = {};
    for (const id of uniqueIds) {
      result[id] = evaluateBookingEligibility(bookingMap.get(id), userId, now);
    }

    return result;
  }

  /**
   * Public operator rating summary (VISIBLE reviews only).
   */
  async getOperatorSummary(operatorId: string): Promise<OperatorReviewSummaryDto> {
    const groups = await this.reviewRepo.groupRatings({
      operatorId,
      status: ReviewStatus.VISIBLE,
    });

    return buildRatingSummary(operatorId, groups);
  }

  /**
   * Public paginated list of VISIBLE reviews for an operator (masked reviewer names).
   */
  async getPublicOperatorReviews(
    operatorId: string,
    query: PublicOperatorReviewsQuery
  ): Promise<PaginatedResponse<PublicReviewDto>> {
    const page = query.page || DEFAULT_PAGE;
    const limit = Math.min(query.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    let orderBy: Prisma.OperatorReviewOrderByWithRelationInput[];
    switch (query.sort) {
      case 'highest':
        orderBy = [{ rating: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'lowest':
        orderBy = [{ rating: 'asc' }, { createdAt: 'desc' }];
        break;
      case 'newest':
      default:
        orderBy = [{ createdAt: 'desc' }];
        break;
    }

    const { rows, total } = await this.reviewRepo.findPublicByOperator({
      operatorId,
      rating: query.rating,
      orderBy,
      skip,
      take: limit,
    });

    return {
      data: rows.map((row) => this.toPublicReviewDto(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Resolve operator scope for management endpoints:
   * - OPERATOR is always forced to their own token.userId.
   * - ADMIN may filter by queryOperatorId, or view all when omitted.
   */
  private resolveManageOperatorId(
    actor: TokenPayload,
    queryOperatorId?: string
  ): string | undefined {
    if (actor.role === UserRole.OPERATOR) {
      return actor.userId;
    }
    return queryOperatorId;
  }

  /**
   * Operator/Admin dashboard: paginated list of reviews with filters.
   */
  async getManageReviews(
    actor: TokenPayload,
    query: ManageReviewsQuery
  ): Promise<PaginatedResponse<ManageReviewDto>> {
    const page = query.page || DEFAULT_PAGE;
    const limit = Math.min(query.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const scopedOperatorId = this.resolveManageOperatorId(actor, query.operatorId);

    const where: Prisma.OperatorReviewWhereInput = {
      ...(scopedOperatorId ? { operatorId: scopedOperatorId } : {}),
      ...(query.rating !== undefined ? { rating: query.rating } : {}),
      ...(query.replied === true ? { repliedAt: { not: null } } : {}),
      ...(query.replied === false ? { repliedAt: null } : {}),
    };

    if (query.search && query.search.length > 0) {
      where.OR = [
        { comment: { contains: query.search } },
        { operatorReply: { contains: query.search } },
        { booking: { bookingCode: { contains: query.search } } },
        { user: { firstName: { contains: query.search } } },
        { user: { lastName: { contains: query.search } } },
      ];
    }

    const orderBy: Prisma.OperatorReviewOrderByWithRelationInput[] =
      query.sort === 'oldest' ? [{ createdAt: 'asc' }] : [{ createdAt: 'desc' }];

    const { rows, total } = await this.reviewRepo.findForManage({
      where,
      orderBy,
      skip,
      take: limit,
    });

    return {
      data: rows.map((row) => this.toManageReviewDto(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Operator/Admin dashboard: rating statistics + reply counts + last 30 days count.
   */
  async getManageStats(
    actor: TokenPayload,
    queryOperatorId?: string,
    now: Date = new Date()
  ): Promise<ManageReviewStatsDto> {
    const scopedOperatorId = this.resolveManageOperatorId(actor, queryOperatorId);
    const baseWhere: Prisma.OperatorReviewWhereInput = scopedOperatorId
      ? { operatorId: scopedOperatorId }
      : {};

    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

    const [groups, repliedCount, last30DaysCount] = await Promise.all([
      this.reviewRepo.groupRatings(baseWhere),
      this.reviewRepo.countReviews({
        ...baseWhere,
        repliedAt: { not: null },
      }),
      this.reviewRepo.countReviews({
        ...baseWhere,
        createdAt: { gte: thirtyDaysAgo },
      }),
    ]);

    const summary = buildRatingSummary(scopedOperatorId ?? null, groups);
    const unrepliedCount = Math.max(0, summary.totalReviews - repliedCount);

    return {
      ...summary,
      repliedCount,
      unrepliedCount,
      last30DaysCount,
    };
  }

  /**
   * Operator/Admin replies to a review (PUT overwrites existing reply).
   * OPERATOR can only reply to reviews belonging to their own operatorId;
   * foreign reviews return 404 to prevent leaking existence.
   */
  async replyToReview(
    actor: TokenPayload,
    reviewId: string,
    replyText: string,
    ipAddress?: string,
    now: Date = new Date()
  ): Promise<ManageReviewDto> {
    const existing = await this.reviewRepo.findByIdWithRelations(reviewId);

    if (!existing) {
      throw new NotFoundError('Review', reviewId);
    }

    if (actor.role === UserRole.OPERATOR && existing.operatorId !== actor.userId) {
      throw new NotFoundError('Review', reviewId);
    }

    const updated = await this.reviewRepo.setReply(reviewId, replyText.trim(), now);

    // Best-effort audit log
    try {
      await writeAuditLog({
        actorId: actor.userId,
        actorName: actor.email || actor.userId,
        actorRole: actor.role,
        action: 'REVIEW_REPLIED',
        target: `review:${reviewId}`,
        targetId: reviewId,
        metadata: {
          bookingId: existing.bookingId,
          operatorId: existing.operatorId,
        },
        ipAddress,
      });
    } catch {
      // Never fail reply on audit write failure
    }

    return this.toManageReviewDto(updated);
  }
}
