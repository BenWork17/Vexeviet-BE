import { Prisma, UserRole, writeAuditLog } from '@vexeviet/database';
import { NotFoundError } from '../middlewares/error.middleware';
import { ReviewRepository, ReviewWithRelations } from '../repositories/review.repository';
import { PaginatedResponse, TokenPayload } from '../types';
import {
  ManageReviewDto,
  ManageReviewStatsDto,
  ManageReviewsQuery,
  PublicReviewDto,
} from '../types/review.types';
import { buildRatingSummary, maskReviewerName } from './review.service';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function toPublicReviewDto(row: ReviewWithRelations): PublicReviewDto {
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

export class ReviewAdminService {
  private readonly reviewRepo: ReviewRepository;

  constructor(reviewRepo: ReviewRepository = new ReviewRepository()) {
    this.reviewRepo = reviewRepo;
  }

  private toManageReviewDto(row: ReviewWithRelations): ManageReviewDto {
    const fullName =
      `${row.user.firstName || ''} ${row.user.lastName || ''}`.trim() || 'Khách hàng';
    return {
      ...toPublicReviewDto(row),
      reviewerName: fullName,
      bookingId: row.bookingId,
      bookingCode: row.booking.bookingCode,
      status: row.status,
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
      data: rows.map(row => this.toManageReviewDto(row)),
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
   * OPERATOR can only reply to reviews belonging to their own operatorId.
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
