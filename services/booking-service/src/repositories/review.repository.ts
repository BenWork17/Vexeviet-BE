import {
  prisma,
  Prisma,
  OperatorReview,
  ReviewStatus,
  BookingStatus,
} from '@vexeviet/database';

export interface BookingForReviewRow {
  id: string;
  bookingCode: string;
  userId: string;
  routeId: string;
  departureDate: Date;
  status: BookingStatus;
  route: {
    id: string;
    operatorId: string;
    origin: string;
    destination: string;
    departureTime: Date;
    arrivalTime: Date;
    duration: number;
  };
  review: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    operatorReply: string | null;
    repliedAt: Date | null;
  } | null;
}

export interface ReviewWithRelations extends OperatorReview {
  user: {
    firstName: string;
    lastName: string;
  };
  route: {
    origin: string;
    destination: string;
    departureTime: Date;
  } | null;
  booking: {
    bookingCode: string;
    departureDate: Date;
  };
}

export interface MyReviewRow extends OperatorReview {
  route: {
    origin: string;
    destination: string;
    departureTime: Date;
  } | null;
}

export interface RatingGroupRow {
  rating: number;
  _count: {
    id: number;
  };
}

export class ReviewRepository {
  async findBookingForReview(bookingId: string): Promise<BookingForReviewRow | null> {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingCode: true,
        userId: true,
        routeId: true,
        departureDate: true,
        status: true,
        route: {
          select: {
            id: true,
            operatorId: true,
            origin: true,
            destination: true,
            departureTime: true,
            arrivalTime: true,
            duration: true,
          },
        },
        review: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            operatorReply: true,
            repliedAt: true,
          },
        },
      },
    });
  }

  async findBookingsForEligibility(bookingIds: string[]): Promise<BookingForReviewRow[]> {
    if (bookingIds.length === 0) {
      return [];
    }

    return prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      select: {
        id: true,
        bookingCode: true,
        userId: true,
        routeId: true,
        departureDate: true,
        status: true,
        route: {
          select: {
            id: true,
            operatorId: true,
            origin: true,
            destination: true,
            departureTime: true,
            arrivalTime: true,
            duration: true,
          },
        },
        review: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            operatorReply: true,
            repliedAt: true,
          },
        },
      },
    });
  }

  async create(data: {
    bookingId: string;
    userId: string;
    operatorId: string;
    routeId: string;
    rating: number;
    comment: string | null;
  }): Promise<OperatorReview> {
    return prisma.operatorReview.create({
      data: {
        bookingId: data.bookingId,
        userId: data.userId,
        operatorId: data.operatorId,
        routeId: data.routeId,
        rating: data.rating,
        comment: data.comment,
        status: ReviewStatus.VISIBLE,
      },
    });
  }

  async findByUserId(
    userId: string,
    skip: number,
    take: number
  ): Promise<{ rows: MyReviewRow[]; total: number }> {
    const where: Prisma.OperatorReviewWhereInput = { userId };

    const [rows, total] = await Promise.all([
      prisma.operatorReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          route: {
            select: {
              origin: true,
              destination: true,
              departureTime: true,
            },
          },
        },
      }),
      prisma.operatorReview.count({ where }),
    ]);

    return { rows, total };
  }

  async findPublicByOperator(params: {
    operatorId: string;
    rating?: number;
    orderBy: Prisma.OperatorReviewOrderByWithRelationInput[];
    skip: number;
    take: number;
  }): Promise<{ rows: ReviewWithRelations[]; total: number }> {
    const where: Prisma.OperatorReviewWhereInput = {
      operatorId: params.operatorId,
      status: ReviewStatus.VISIBLE,
      ...(params.rating !== undefined ? { rating: params.rating } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.operatorReview.findMany({
        where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          route: {
            select: {
              origin: true,
              destination: true,
              departureTime: true,
            },
          },
          booking: {
            select: {
              bookingCode: true,
              departureDate: true,
            },
          },
        },
      }),
      prisma.operatorReview.count({ where }),
    ]);

    return { rows, total };
  }

  async groupRatings(where: Prisma.OperatorReviewWhereInput): Promise<RatingGroupRow[]> {
    const groups = await prisma.operatorReview.groupBy({
      by: ['rating'],
      where,
      _count: {
        id: true,
      },
    });

    return groups.map((g) => ({
      rating: g.rating,
      _count: { id: g._count.id },
    }));
  }

  async findForManage(params: {
    where: Prisma.OperatorReviewWhereInput;
    orderBy: Prisma.OperatorReviewOrderByWithRelationInput[];
    skip: number;
    take: number;
  }): Promise<{ rows: ReviewWithRelations[]; total: number }> {
    const [rows, total] = await Promise.all([
      prisma.operatorReview.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          route: {
            select: {
              origin: true,
              destination: true,
              departureTime: true,
            },
          },
          booking: {
            select: {
              bookingCode: true,
              departureDate: true,
            },
          },
        },
      }),
      prisma.operatorReview.count({ where: params.where }),
    ]);

    return { rows, total };
  }

  async countReviews(where: Prisma.OperatorReviewWhereInput): Promise<number> {
    return prisma.operatorReview.count({ where });
  }

  async findByIdWithRelations(id: string): Promise<ReviewWithRelations | null> {
    return prisma.operatorReview.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        route: {
          select: {
            origin: true,
            destination: true,
            departureTime: true,
          },
        },
        booking: {
          select: {
            bookingCode: true,
            departureDate: true,
          },
        },
      },
    });
  }

  async setReply(id: string, reply: string, repliedAt: Date): Promise<ReviewWithRelations> {
    return prisma.operatorReview.update({
      where: { id },
      data: {
        operatorReply: reply,
        repliedAt,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        route: {
          select: {
            origin: true,
            destination: true,
            departureTime: true,
          },
        },
        booking: {
          select: {
            bookingCode: true,
            departureDate: true,
          },
        },
      },
    });
  }
}
