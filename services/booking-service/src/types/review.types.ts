import { ReviewStatus } from '@vexeviet/database';

export type ReviewEligibilityReason =
  | 'TRIP_NOT_COMPLETED'
  | 'ALREADY_REVIEWED'
  | 'NOT_OWNER';

export interface ReviewDto {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  operatorId: string;
  routeId: string;
  operatorReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export interface MyReviewDto extends ReviewDto {
  route: {
    fromCity: string;
    toCity: string;
    departureTime: string;
  } | null;
}

export interface EligibilityReviewSnapshot {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  operatorReply: string | null;
  repliedAt: string | null;
}

export interface ReviewEligibilityItem {
  canReview: boolean;
  reason: ReviewEligibilityReason | null;
  review: EligibilityReviewSnapshot | null;
}

export type ReviewEligibilityMap = Record<string, ReviewEligibilityItem>;

export interface RatingDistribution {
  '1': number;
  '2': number;
  '3': number;
  '4': number;
  '5': number;
}

export interface OperatorReviewSummaryDto {
  operatorId: string | null;
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistribution;
}

export interface ManageReviewStatsDto extends OperatorReviewSummaryDto {
  repliedCount: number;
  unrepliedCount: number;
  last30DaysCount: number;
}

export interface PublicReviewDto {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  createdAt: string;
  route: {
    fromCity: string;
    toCity: string;
  } | null;
  tripDate: string;
  verified: true;
  operatorReply: string | null;
  repliedAt: string | null;
}

export interface ManageReviewDto extends PublicReviewDto {
  bookingId: string;
  bookingCode: string;
  status: ReviewStatus;
}

export interface CreateReviewInput {
  bookingId: string;
  rating: number;
  comment?: string;
}

export interface ReplyReviewInput {
  reply: string;
}

export interface PublicOperatorReviewsQuery {
  page?: number;
  limit?: number;
  rating?: number;
  sort?: 'newest' | 'highest' | 'lowest';
}

export interface ManageReviewsQuery {
  page?: number;
  limit?: number;
  rating?: number;
  replied?: boolean;
  search?: string;
  sort?: 'newest' | 'oldest';
  operatorId?: string;
}

export interface MyReviewsQuery {
  page?: number;
  limit?: number;
}
