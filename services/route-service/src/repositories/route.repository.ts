import { prisma } from '@vexeviet/database';
import { Route, Prisma, RouteStatus, UserRole, UserStatus, SeatStatus } from '@vexeviet/database';

export type RouteWithOperator = Route & {
  operator: { id: string; firstName: string; lastName: string; email: string };
};

/**
 * Admin list row: the raw route plus the operator join. Seat figures are NOT
 * loaded here — `RouteService` derives them in batch from the ids in `rows`.
 */
export interface AdminRouteRow {
  id: string;
  name: string;
  origin: string;
  destination: string;
  departureTime: Date;
  busType: Route['busType'];
  price: Prisma.Decimal;
  status: Route['status'];
  busTemplateId: string | null;
  operatorId: string;
  operator: { id: string; firstName: string; lastName: string; email: string };
}

export class RouteRepository {
  async create(data: Prisma.RouteCreateInput): Promise<Route> {
    return prisma.route.create({ data });
  }

  async findById(id: string): Promise<Route | null> {
    return prisma.route.findFirst({
      where: {
        id,
        status: { not: RouteStatus.DELETED },
      },
    });
  }

  async findByIdWithOperator(id: string): Promise<(Route & { operator: { id: string; firstName: string; lastName: string; email: string } }) | null> {
    return prisma.route.findFirst({
      where: {
        id,
        status: { not: RouteStatus.DELETED },
      },
      include: {
        operator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findMany(params: {
    where?: Prisma.RouteWhereInput;
    orderBy?: Prisma.RouteOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<Route[]> {
    const { where, orderBy, skip, take } = params;
    return prisma.route.findMany({
      where: {
        ...where,
        status: { not: RouteStatus.DELETED },
      },
      orderBy,
      skip,
      take,
    });
  }

  async count(where?: Prisma.RouteWhereInput): Promise<number> {
    return prisma.route.count({
      where: {
        ...where,
        status: { not: RouteStatus.DELETED },
      },
    });
  }

  async update(id: string, data: Prisma.RouteUpdateInput): Promise<Route> {
    return prisma.route.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<Route> {
    return prisma.route.update({
      where: { id },
      data: {
        status: RouteStatus.DELETED,
        deletedAt: new Date(),
      },
    });
  }

  async findByOperatorId(operatorId: string, skip?: number, take?: number): Promise<Route[]> {
    return prisma.route.findMany({
      where: {
        operatorId,
        status: { not: RouteStatus.DELETED },
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Admin (Shape 3)
  //
  // These deliberately do NOT force `status != DELETED`: whether DELETED rows
  // are visible is decided by the caller's `where` (the admin `includeDeleted`
  // flag), and the public paths never reach these methods.
  // ---------------------------------------------------------------------------

  async findAdminMany(params: {
    where: Prisma.RouteWhereInput;
    orderBy: Prisma.RouteOrderByWithRelationInput;
    skip: number;
    take: number;
  }): Promise<AdminRouteRow[]> {
    const { where, orderBy, skip, take } = params;
    return prisma.route.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        name: true,
        origin: true,
        destination: true,
        departureTime: true,
        busType: true,
        price: true,
        status: true,
        busTemplateId: true,
        operatorId: true,
        operator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async countAdmin(where: Prisma.RouteWhereInput): Promise<number> {
    return prisma.route.count({ where });
  }

  /**
   * Total seats per bus template in ONE query. Returns `totalSeats` from the
   * template; the caller falls back to the Seat count only for templates that
   * are missing from this map.
   */
  async findBusTemplateTotalSeats(busTemplateIds: string[]): Promise<Map<string, number>> {
    if (busTemplateIds.length === 0) {
      return new Map();
    }

    const templates = await prisma.busTemplate.findMany({
      where: { id: { in: busTemplateIds } },
      select: { id: true, totalSeats: true },
    });

    return new Map(templates.map((template) => [template.id, template.totalSeats]));
  }

  /** Fallback seat counts per template (only used when the template row is absent). */
  async countAvailableSeatDefinitions(busTemplateIds: string[]): Promise<Map<string, number>> {
    if (busTemplateIds.length === 0) {
      return new Map();
    }

    const counts = await prisma.seat.groupBy({
      by: ['busTemplateId'],
      where: { busTemplateId: { in: busTemplateIds }, isAvailable: true },
      _count: { id: true },
    });

    return new Map(counts.map((row) => [row.busTemplateId, row._count.id]));
  }

  /**
   * Occupied seats per `(routeId, departureDate)` in ONE groupBy — the same
   * predicate and the same date dimension `RouteService.calculateAvailableSeats`
   * uses for a single route. Grouping by date as well as route matters: a route
   * runs on many dates and only its own date is relevant.
   */
  async countOccupiedSeatsByRoute(
    routeIds: string[]
  ): Promise<Map<string, number>> {
    if (routeIds.length === 0) {
      return new Map();
    }

    const now = new Date();
    const occupied = await prisma.bookingSeat.groupBy({
      by: ['routeId', 'departureDate'],
      where: {
        routeId: { in: routeIds },
        OR: [
          { status: SeatStatus.BOOKED },
          { status: SeatStatus.HELD, lockedUntil: { gt: now } },
        ],
      },
      _count: { id: true },
    });

    return new Map(
      occupied.map((row) => [
        `${row.routeId}_${row.departureDate.toISOString().split('T')[0]}`,
        row._count.id,
      ])
    );
  }

  /**
   * Operators as `User` rows with `role=OPERATOR`. There is no operator table
   * and none is to be created (contract Shape 3).
   */
  async findOperators(params: {
    where: Prisma.UserWhereInput;
    skip: number;
    take: number;
  }): Promise<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      status: UserStatus;
      createdAt: Date;
    }>
  > {
    const { where, skip, take } = params;
    return prisma.user.findMany({
      where: { ...where, role: UserRole.OPERATOR },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async countOperators(where: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({ where: { ...where, role: UserRole.OPERATOR } });
  }

  /** `activeRoutes` per operator in ONE groupBy (count of status=ACTIVE routes). */
  async countActiveRoutesByOperator(operatorIds: string[]): Promise<Map<string, number>> {
    if (operatorIds.length === 0) {
      return new Map();
    }

    const counts = await prisma.route.groupBy({
      by: ['operatorId'],
      where: { operatorId: { in: operatorIds }, status: RouteStatus.ACTIVE },
      _count: { id: true },
    });

    return new Map(counts.map((row) => [row.operatorId, row._count.id]));
  }

  /**
   * Bookings created since `since`, grouped by route, then folded onto the
   * route's operator. Two queries total, independent of operator count.
   */
  async countBookingsByOperatorSince(
    operatorIds: string[],
    since: Date
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (operatorIds.length === 0) {
      return result;
    }

    const bookingCounts = await prisma.booking.groupBy({
      by: ['routeId'],
      where: {
        createdAt: { gte: since },
        route: { operatorId: { in: operatorIds } },
      },
      _count: { id: true },
    });

    if (bookingCounts.length === 0) {
      return result;
    }

    const routes = await prisma.route.findMany({
      where: { id: { in: bookingCounts.map((row) => row.routeId) } },
      select: { id: true, operatorId: true },
    });
    const routeToOperator = new Map(routes.map((route) => [route.id, route.operatorId]));

    for (const row of bookingCounts) {
      const operatorId = routeToOperator.get(row.routeId);
      if (!operatorId) {
        continue;
      }
      result.set(operatorId, (result.get(operatorId) ?? 0) + row._count.id);
    }

    return result;
  }
}
