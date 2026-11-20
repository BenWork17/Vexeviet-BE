import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BookingStatus, ReviewStatus, UserRole } from '@vexeviet/database';
import {
  buildRatingSummary,
  evaluateBookingEligibility,
  isTripCompletedForReview,
  maskReviewerName,
  ReviewService,
} from './review.service';
import {
  BookingForReviewRow,
  ReviewRepository,
  ReviewWithRelations,
} from '../repositories/review.repository';
import {
  BookingNotFoundError,
  NotFoundError,
  ReviewAlreadyExistsError,
  TripNotCompletedError,
} from '../middlewares/error.middleware';
import {
  createReviewSchema,
  eligibilityQuerySchema,
  replyReviewSchema,
} from '../validators/review.validator';

const NOW = new Date('2026-11-20T12:00:00.000Z');
const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_CUSTOMER_ID = '22222222-2222-4222-8222-222222222222';
const OPERATOR_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_OPERATOR_ID = '44444444-4444-4444-8444-444444444444';
const ADMIN_ID = '55555555-5555-4555-8555-555555555555';
const ROUTE_ID = '66666666-6666-4666-8666-666666666666';
const BOOKING_ID = '77777777-7777-4777-8777-777777777777';
const REVIEW_ID = '88888888-8888-4888-8888-888888888888';

function makeBooking(overrides: Partial<BookingForReviewRow> = {}): BookingForReviewRow {
  return {
    id: BOOKING_ID,
    bookingCode: 'VXV123456',
    userId: CUSTOMER_ID,
    routeId: ROUTE_ID,
    departureDate: new Date('2026-11-18T00:00:00.000Z'),
    status: BookingStatus.COMPLETED,
    route: {
      id: ROUTE_ID,
      operatorId: OPERATOR_ID,
      origin: 'Ho Chi Minh City',
      destination: 'Da Lat',
      departureTime: new Date('2026-11-18T06:00:00.000Z'),
      arrivalTime: new Date('2026-11-18T12:00:00.000Z'),
      duration: 360,
    },
    review: null,
    ...overrides,
  };
}

function makeReviewWithRelations(
  overrides: Partial<ReviewWithRelations> = {}
): ReviewWithRelations {
  return {
    id: REVIEW_ID,
    bookingId: BOOKING_ID,
    userId: CUSTOMER_ID,
    operatorId: OPERATOR_ID,
    routeId: ROUTE_ID,
    rating: 5,
    comment: 'Xe sạch sẽ, chạy đúng giờ',
    status: ReviewStatus.VISIBLE,
    operatorReply: null,
    repliedAt: null,
    createdAt: new Date('2026-11-19T10:00:00.000Z'),
    updatedAt: new Date('2026-11-19T10:00:00.000Z'),
    user: {
      firstName: 'Nguyễn Văn',
      lastName: 'An',
    },
    route: {
      origin: 'Ho Chi Minh City',
      destination: 'Da Lat',
      departureTime: new Date('2026-11-18T06:00:00.000Z'),
    },
    booking: {
      bookingCode: 'VXV123456',
      departureDate: new Date('2026-11-18T00:00:00.000Z'),
    },
    ...overrides,
  };
}

function createMockRepo(overrides: Partial<ReviewRepository> = {}): ReviewRepository {
  return {
    findBookingForReview: async () => null,
    findBookingsForEligibility: async () => [],
    create: async () => {
      throw new Error('not mocked');
    },
    findByUserId: async () => ({ rows: [], total: 0 }),
    findPublicByOperator: async () => ({ rows: [], total: 0 }),
    groupRatings: async () => [],
    findForManage: async () => ({ rows: [], total: 0 }),
    countReviews: async () => 0,
    findByIdWithRelations: async () => null,
    setReply: async () => {
      throw new Error('not mocked');
    },
    ...overrides,
  } as unknown as ReviewRepository;
}

describe('maskReviewerName', () => {
  it('masks middle name for 3-part Vietnamese name', () => {
    assert.equal(maskReviewerName('Nguyễn Văn', 'A'), 'Nguyễn V*** A');
    assert.equal(maskReviewerName('Nguyễn Thị Mai', 'Anh'), 'Nguyễn T*** M*** Anh');
  });

  it('masks last name for 2-part name', () => {
    assert.equal(maskReviewerName('Nguyễn', 'An'), 'Nguyễn A***');
  });

  it('masks single-word name and handles empty', () => {
    assert.equal(maskReviewerName('An', ''), 'A***');
    assert.equal(maskReviewerName('', ''), 'Khách hàng');
  });
});

describe('eligibility matrix', () => {
  it('allows COMPLETED booking owned by customer with no existing review', () => {
    const booking = makeBooking({ status: BookingStatus.COMPLETED });
    const result = evaluateBookingEligibility(booking, CUSTOMER_ID, NOW);
    assert.deepEqual(result, { canReview: true, reason: null, review: null });
  });

  it('allows CONFIRMED booking when trip end time has passed', () => {
    const booking = makeBooking({
      status: BookingStatus.CONFIRMED,
      departureDate: new Date('2026-11-19T00:00:00.000Z'),
    });
    assert.equal(isTripCompletedForReview(booking, NOW), true);
    assert.equal(evaluateBookingEligibility(booking, CUSTOMER_ID, NOW).canReview, true);
  });

  it('blocks CONFIRMED booking when trip has not finished yet', () => {
    const booking = makeBooking({
      status: BookingStatus.CONFIRMED,
      departureDate: new Date('2026-11-25T00:00:00.000Z'),
    });
    const result = evaluateBookingEligibility(booking, CUSTOMER_ID, NOW);
    assert.equal(result.canReview, false);
    assert.equal(result.reason, 'TRIP_NOT_COMPLETED');
  });

  it('blocks PENDING, CANCELLED, and EXPIRED bookings', () => {
    for (const status of [
      BookingStatus.PENDING,
      BookingStatus.CANCELLED,
      BookingStatus.EXPIRED,
    ]) {
      const booking = makeBooking({ status });
      const result = evaluateBookingEligibility(booking, CUSTOMER_ID, NOW);
      assert.equal(result.canReview, false);
      assert.equal(result.reason, 'TRIP_NOT_COMPLETED');
    }
  });

  it('returns NOT_OWNER for foreign or missing booking', () => {
    const booking = makeBooking({ userId: OTHER_CUSTOMER_ID });
    assert.equal(evaluateBookingEligibility(booking, CUSTOMER_ID, NOW).reason, 'NOT_OWNER');
    assert.equal(evaluateBookingEligibility(undefined, CUSTOMER_ID, NOW).reason, 'NOT_OWNER');
  });

  it('returns ALREADY_REVIEWED with review snapshot when already reviewed', () => {
    const booking = makeBooking({
      review: {
        id: REVIEW_ID,
        rating: 4,
        comment: 'Tốt',
        createdAt: new Date('2026-11-19T09:00:00.000Z'),
        operatorReply: 'Cảm ơn quý khách!',
        repliedAt: new Date('2026-11-19T12:00:00.000Z'),
      },
    });
    const result = evaluateBookingEligibility(booking, CUSTOMER_ID, NOW);
    assert.equal(result.canReview, false);
    assert.equal(result.reason, 'ALREADY_REVIEWED');
    assert.equal(result.review?.id, REVIEW_ID);
    assert.equal(result.review?.operatorReply, 'Cảm ơn quý khách!');
  });
});

describe('ReviewService.createReview', () => {
  it('creates review deriving operatorId and routeId from booking', async () => {
    let capturedInput: Record<string, unknown> | null = null;
    const repo = createMockRepo({
      findBookingForReview: async () => makeBooking(),
      create: async (data) => {
        capturedInput = data as unknown as Record<string, unknown>;
        return {
          id: REVIEW_ID,
          ...data,
          status: ReviewStatus.VISIBLE,
          operatorReply: null,
          repliedAt: null,
          createdAt: NOW,
          updatedAt: NOW,
        };
      },
    });

    const service = new ReviewService(repo);
    const created = await service.createReview(
      CUSTOMER_ID,
      { bookingId: BOOKING_ID, rating: 5, comment: '  Rất hài lòng  ' },
      NOW
    );

    assert.equal(created.id, REVIEW_ID);
    assert.equal(created.operatorId, OPERATOR_ID);
    assert.equal(created.routeId, ROUTE_ID);
    assert.equal(created.comment, 'Rất hài lòng');
    assert.deepEqual(capturedInput, {
      bookingId: BOOKING_ID,
      userId: CUSTOMER_ID,
      operatorId: OPERATOR_ID,
      routeId: ROUTE_ID,
      rating: 5,
      comment: 'Rất hài lòng',
    });
  });

  it('throws 404 BOOKING_NOT_FOUND for foreign booking', async () => {
    const repo = createMockRepo({
      findBookingForReview: async () => makeBooking({ userId: OTHER_CUSTOMER_ID }),
    });
    const service = new ReviewService(repo);

    await assert.rejects(
      () => service.createReview(CUSTOMER_ID, { bookingId: BOOKING_ID, rating: 5 }, NOW),
      (err: unknown) => err instanceof BookingNotFoundError && err.statusCode === 404
    );
  });

  it('throws 400 TRIP_NOT_COMPLETED for future confirmed booking', async () => {
    const repo = createMockRepo({
      findBookingForReview: async () =>
        makeBooking({
          status: BookingStatus.CONFIRMED,
          departureDate: new Date('2026-12-01T00:00:00.000Z'),
        }),
    });
    const service = new ReviewService(repo);

    await assert.rejects(
      () => service.createReview(CUSTOMER_ID, { bookingId: BOOKING_ID, rating: 4 }, NOW),
      (err: unknown) => err instanceof TripNotCompletedError && err.statusCode === 400
    );
  });

  it('throws 409 REVIEW_ALREADY_EXISTS on duplicate booking review', async () => {
    const repo = createMockRepo({
      findBookingForReview: async () =>
        makeBooking({
          review: {
            id: REVIEW_ID,
            rating: 5,
            comment: 'Great',
            createdAt: NOW,
            operatorReply: null,
            repliedAt: null,
          },
        }),
    });
    const service = new ReviewService(repo);

    await assert.rejects(
      () => service.createReview(CUSTOMER_ID, { bookingId: BOOKING_ID, rating: 5 }, NOW),
      (err: unknown) => err instanceof ReviewAlreadyExistsError && err.statusCode === 409
    );
  });

  it('maps Prisma P2002 unique constraint race to 409 REVIEW_ALREADY_EXISTS', async () => {
    const repo = createMockRepo({
      findBookingForReview: async () => makeBooking(),
      create: async () => {
        const err = new Error('Unique constraint failed') as Error & { code: string };
        err.code = 'P2002';
        throw err;
      },
    });
    const service = new ReviewService(repo);

    await assert.rejects(
      () => service.createReview(CUSTOMER_ID, { bookingId: BOOKING_ID, rating: 5 }, NOW),
      (err: unknown) => err instanceof ReviewAlreadyExistsError && err.statusCode === 409
    );
  });
});

describe('rating aggregation & distribution', () => {
  it('returns 0 average and zeroed distribution when no reviews exist', () => {
    const summary = buildRatingSummary(OPERATOR_ID, []);
    assert.deepEqual(summary, {
      operatorId: OPERATOR_ID,
      averageRating: 0,
      totalReviews: 0,
      distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    });
  });

  it('computes 1-decimal average and star breakdown accurately', () => {
    const summary = buildRatingSummary(OPERATOR_ID, [
      { rating: 5, _count: { id: 2 } },
      { rating: 4, _count: { id: 1 } },
      { rating: 2, _count: { id: 1 } },
    ]);
    // (5*2 + 4*1 + 2*1) / 4 = 16 / 4 = 4.0
    assert.equal(summary.averageRating, 4);
    assert.equal(summary.totalReviews, 4);
    assert.deepEqual(summary.distribution, { '1': 0, '2': 1, '3': 0, '4': 1, '5': 2 });

    const summaryRounded = buildRatingSummary(OPERATOR_ID, [
      { rating: 5, _count: { id: 2 } },
      { rating: 3, _count: { id: 1 } },
    ]);
    // 13 / 3 = 4.333... -> 4.3
    assert.equal(summaryRounded.averageRating, 4.3);
  });

  it('computes manage stats with replied/unreplied/last30Days counts', async () => {
    const repo = createMockRepo({
      groupRatings: async () => [
        { rating: 5, _count: { id: 3 } },
        { rating: 4, _count: { id: 2 } },
      ],
      countReviews: async (where) => {
        if ('repliedAt' in where) return 2;
        if ('createdAt' in where) return 4;
        return 5;
      },
    });

    const service = new ReviewService(repo);
    const stats = await service.getManageStats(
      { userId: OPERATOR_ID, email: 'op@test.com', role: UserRole.OPERATOR },
      OTHER_OPERATOR_ID, // must be ignored for OPERATOR
      NOW
    );

    assert.equal(stats.operatorId, OPERATOR_ID);
    assert.equal(stats.totalReviews, 5);
    assert.equal(stats.averageRating, 4.6);
    assert.equal(stats.repliedCount, 2);
    assert.equal(stats.unrepliedCount, 3);
    assert.equal(stats.last30DaysCount, 4);
  });
});

describe('operator scoping, reply authz, and public PII masking', () => {
  it('forces OPERATOR scope on getManageReviews even if query passes another operatorId', async () => {
    let capturedWhere: Record<string, unknown> = {};
    const repo = createMockRepo({
      findForManage: async ({ where }) => {
        capturedWhere = where as Record<string, unknown>;
        return { rows: [], total: 0 };
      },
    });
    const service = new ReviewService(repo);

    await service.getManageReviews(
      { userId: OPERATOR_ID, email: 'op@test.com', role: UserRole.OPERATOR },
      { operatorId: OTHER_OPERATOR_ID, page: 1, limit: 10 }
    );

    assert.equal(capturedWhere.operatorId, OPERATOR_ID);
  });

  it('rejects OPERATOR replying to another operator review with 404 (no leaking)', async () => {
    const repo = createMockRepo({
      findByIdWithRelations: async () =>
        makeReviewWithRelations({ operatorId: OTHER_OPERATOR_ID }),
    });
    const service = new ReviewService(repo);

    await assert.rejects(
      () =>
        service.replyToReview(
          { userId: OPERATOR_ID, email: 'op@test.com', role: UserRole.OPERATOR },
          REVIEW_ID,
          'Cảm ơn bạn',
          '127.0.0.1',
          NOW
        ),
      (err: unknown) => err instanceof NotFoundError && err.statusCode === 404
    );
  });

  it('allows owning OPERATOR and ADMIN to reply and returns ManageReviewDto', async () => {
    const repo = createMockRepo({
      findByIdWithRelations: async () => makeReviewWithRelations(),
      setReply: async (_id, reply, repliedAt) =>
        makeReviewWithRelations({ operatorReply: reply, repliedAt }),
    });
    const service = new ReviewService(repo);

    const byOp = await service.replyToReview(
      { userId: OPERATOR_ID, email: 'op@test.com', role: UserRole.OPERATOR },
      REVIEW_ID,
      'Cảm ơn quý khách!',
      '127.0.0.1',
      NOW
    );
    assert.equal(byOp.operatorReply, 'Cảm ơn quý khách!');
    assert.equal(byOp.repliedAt, NOW.toISOString());
    assert.equal(byOp.bookingCode, 'VXV123456');
    assert.equal(byOp.reviewerName, 'Nguyễn Văn An');

    const byAdmin = await service.replyToReview(
      { userId: ADMIN_ID, email: 'admin@test.com', role: UserRole.ADMIN },
      REVIEW_ID,
      'Admin phản hồi',
      '127.0.0.1',
      NOW
    );
    assert.equal(byAdmin.operatorReply, 'Admin phản hồi');
  });

  it('public reviews mask reviewerName and omit userId/email/phone', async () => {
    const repo = createMockRepo({
      findPublicByOperator: async () => ({
        rows: [makeReviewWithRelations()],
        total: 1,
      }),
    });
    const service = new ReviewService(repo);
    const result = await service.getPublicOperatorReviews(OPERATOR_ID, {
      page: 1,
      limit: 10,
      sort: 'newest',
    });

    assert.equal(result.data.length, 1);
    const item = result.data[0] as unknown as Record<string, unknown>;
    assert.equal(item.reviewerName, 'Nguyễn V*** An');
    assert.equal(item.verified, true);
    assert.equal(item.tripDate, '2026-11-18');
    assert.equal('userId' in item, false);
    assert.equal('email' in item, false);
    assert.equal('phone' in item, false);
    assert.equal('bookingId' in item, false);
  });
});

describe('review validators', () => {
  it('validates createReviewSchema bounds', () => {
    assert.equal(
      createReviewSchema.safeParse({ bookingId: BOOKING_ID, rating: 5, comment: '  ok  ' }).success,
      true
    );
    assert.equal(
      createReviewSchema.safeParse({ bookingId: BOOKING_ID, rating: 0 }).success,
      false
    );
    assert.equal(
      createReviewSchema.safeParse({ bookingId: BOOKING_ID, rating: 6 }).success,
      false
    );
    assert.equal(
      createReviewSchema.safeParse({ bookingId: BOOKING_ID, rating: 4.5 }).success,
      false
    );
    assert.equal(
      createReviewSchema.safeParse({ bookingId: 'not-a-uuid', rating: 5 }).success,
      false
    );
    assert.equal(
      createReviewSchema.safeParse({
        bookingId: BOOKING_ID,
        rating: 5,
        comment: 'a'.repeat(1001),
      }).success,
      false
    );
  });

  it('validates replyReviewSchema non-empty & max length', () => {
    assert.equal(replyReviewSchema.safeParse({ reply: '   ' }).success, false);
    assert.equal(replyReviewSchema.safeParse({ reply: 'a'.repeat(1001) }).success, false);
    const ok = replyReviewSchema.safeParse({ reply: '  Cảm ơn bạn  ' });
    assert.equal(ok.success, true);
    if (ok.success) {
      assert.equal(ok.data.reply, 'Cảm ơn bạn');
    }
  });

  it('validates eligibilityQuerySchema max 50 UUIDs', () => {
    assert.equal(eligibilityQuerySchema.safeParse({ bookingIds: BOOKING_ID }).success, true);
    assert.equal(eligibilityQuerySchema.safeParse({ bookingIds: 'bad-id' }).success, false);
    const fiftyOne = Array.from({ length: 51 }, () => BOOKING_ID).join(',');
    assert.equal(eligibilityQuerySchema.safeParse({ bookingIds: fiftyOne }).success, false);
  });
});
