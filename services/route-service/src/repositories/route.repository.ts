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

/**
 * The column set every paginated route list returns, admin and operator alike.
 *
 * Shared rather than duplicated so the operator list cannot drift from the
 * admin list: `RouteService.toAdminRoute` maps exactly these fields.
 */
const ROUTE_PAGE_SELECT = {
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
    select: { id: true, firstName: true, lastName: true, email: true, operatorAvatarUrl: true },
  },
} as const;

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
            operatorAvatarUrl: true,
            interiorImages: true,
            exteriorImages: true,
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

  /**
   * `GET /routes/my/routes`: one bounded page of the operator's own routes.
   *
   * Selects the same `AdminRouteRow` column set the admin list uses, so the
   * operator row is built by the same `toAdminRoute` mapper rather than a
   * second, drifting shape. The DELETED exclusion is inside the predicate, so
   * `countOperatorRoutes` below cannot disagree with the page.
   */
  async findOperatorPage(
    operatorId: string,
    skip: number,
    take: number
  ): Promise<AdminRouteRow[]> {
    return prisma.route.findMany({
      where: { operatorId, status: { not: RouteStatus.DELETED } },
      select: ROUTE_PAGE_SELECT,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Count for `findOperatorPage` — same predicate, so `total` matches the page. */
  async countOperatorRoutes(operatorId: string): Promise<number> {
    return prisma.route.count({
      where: { operatorId, status: { not: RouteStatus.DELETED } },
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
      select: ROUTE_PAGE_SELECT,
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
      operatorAvatarUrl: string | null;
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
        operatorAvatarUrl: true,
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
   * Bookings created since `since`, grouped directly by `routes.operatorId` in
   * ONE indexed SQL JOIN instead of grouping across thousands of `routeId`s.
   */
  async countBookingsByOperatorSince(
    operatorIds: string[],
    since: Date
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (operatorIds.length === 0) {
      return result;
    }

    const rows = await prisma.$queryRaw<Array<{ operatorId: string; cnt: bigint | number }>>`
      SELECT r.operatorId AS operatorId, COUNT(b.id) AS cnt
      FROM bookings b
      INNER JOIN routes r ON r.id = b.routeId
      WHERE b.createdAt >= ${since}
        AND r.operatorId IN (${Prisma.join(operatorIds)})
      GROUP BY r.operatorId
    `;

    for (const row of rows) {
      result.set(row.operatorId, Number(row.cnt));
    }

    return result;
  }
}
