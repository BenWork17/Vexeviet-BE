import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ReviewService } from '../services/review.service';
import {
  CreateReviewInput,
  ManageReviewsQuery,
  MyReviewsQuery,
  PublicOperatorReviewsQuery,
  ReplyReviewInput,
} from '../types/review.types';

export class ReviewController {
  private readonly reviewService: ReviewService;

  constructor(reviewService: ReviewService = new ReviewService()) {
    this.reviewService = reviewService;
  }

  /**
   * POST /api/v1/reviews
   */
  createReview = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const body = req.body as CreateReviewInput;
      const review = await this.reviewService.createReview(userId, body);

      res.status(201).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/reviews/my
   */
  getMyReviews = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const query = (res.locals.validatedQuery || {}) as MyReviewsQuery;
      const result = await this.reviewService.getMyReviews(userId, query);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/reviews/eligibility?bookingIds=id1,id2,...
   */
  getEligibility = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { bookingIds } = (res.locals.validatedQuery || { bookingIds: [] }) as {
        bookingIds: string[];
      };

      const eligibility = await this.reviewService.getEligibility(userId, bookingIds);

      res.status(200).json({
        success: true,
        data: eligibility,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/reviews/operators/:operatorId/summary
   */
  getOperatorSummary = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const operatorId = String(req.params.operatorId);
      const summary = await this.reviewService.getOperatorSummary(operatorId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/reviews/operators/:operatorId
   */
  getPublicOperatorReviews = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const operatorId = String(req.params.operatorId);
      const query = (res.locals.validatedQuery || {}) as PublicOperatorReviewsQuery;
      const result = await this.reviewService.getPublicOperatorReviews(operatorId, query);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/reviews/manage
   */
  getManageReviews = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const query = (res.locals.validatedQuery || {}) as ManageReviewsQuery;
      const result = await this.reviewService.getManageReviews(req.user, query);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/reviews/manage/stats
   */
  getManageStats = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { operatorId } = (res.locals.validatedQuery || {}) as { operatorId?: string };
      const stats = await this.reviewService.getManageStats(req.user, operatorId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/reviews/manage/:id/reply
   */
  replyToReview = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const id = String(req.params.id);
      const { reply } = req.body as ReplyReviewInput;
      const updated = await this.reviewService.replyToReview(
        req.user,
        id,
        reply,
        req.ip
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };
}
