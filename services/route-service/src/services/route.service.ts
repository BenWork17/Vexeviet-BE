import {
  Route,
  BusType,
  RouteStatus,
  SeatStatus,
  Prisma,
  prisma,
  UserRole,
  writeAuditLog,
} from '@vexeviet/database';
import { RouteRepository, AdminRouteRow } from '../repositories/route.repository';
import {
  CreateRouteRequest,
  UpdateRouteRequest,
  RouteQuery,
  AdminRouteQuery,
  AdminRoute,
  AdminOperator,
  PaginatedResponse,
  TokenPayload,
} from '../types';

// Extended Route type with computed availableSeats
type RouteWithAvailability = Route & {
  totalSeats: number;
  availableSeats: number;
  actualTotalSeats: number;
};

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MONTHLY_WINDOW_DAYS = 30;

export class RouteService {
  private routeRepo: RouteRepository;

  constructor() {
    this.routeRepo = new RouteRepository();
  }

  /**
   * Get actual total seats from BusTemplate
   */
  private async getActualTotalSeats(busTemplateId: string | null): Promise<number> {
    if (!busTemplateId) {
      return 0;
    }

    // Try to get totalSeats from BusTemplate table first as a cache
    const template = await prisma.busTemplate.findUnique({
      where: { id: busTemplateId },
      select: { totalSeats: true }
    });

    if (template) {
      return template.totalSeats;
    }

    // Fallback: count seats in Seat table
    const seatCount = await prisma.seat.count({
      where: {
        busTemplateId,
        isAvailable: true,
      },
    });

    return seatCount;
  }

  /**
   * Calculate available seats for a single route
   */
  private async calculateAvailableSeats(
    routeId: string,
    departureDate: Date,
    totalSeats: number
  ): Promise<number> {
    const occupiedSeatsCount = await prisma.bookingSeat.count({
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
    });

    return totalSeats - occupiedSeatsCount;
  }

  async create(operatorId: string, data: CreateRouteRequest): Promise<Route> {
    const routeData: Prisma.RouteCreateInput = {
      name: data.name,
      description: data.description,
      origin: data.origin,
      destination: data.destination,
      departureLocation: data.departureLocation,
      arrivalLocation: data.arrivalLocation,
      distance: data.distance,
      departureTime: new Date(data.departureTime),
      arrivalTime: new Date(data.arrivalTime),
      duration: data.duration,
      busType: data.busType || BusType.STANDARD,
      licensePlate: data.licensePlate,
      // totalSeats and availableSeats removed
      price: data.price,
      amenities: data.amenities ? (JSON.parse(JSON.stringify(data.amenities)) as Prisma.InputJsonValue) : undefined,
      pickupPoints: data.pickupPoints ? (JSON.parse(JSON.stringify(data.pickupPoints)) as Prisma.InputJsonValue) : undefined,
      dropoffPoints: data.dropoffPoints ? (JSON.parse(JSON.stringify(data.dropoffPoints)) as Prisma.InputJsonValue) : undefined,
      policies: data.policies ? (JSON.parse(JSON.stringify(data.policies)) as Prisma.InputJsonValue) : undefined,
      images: data.images ? (JSON.parse(JSON.stringify(data.images)) as Prisma.InputJsonValue) : undefined,
      operator: { connect: { id: operatorId } },
    };

    return this.routeRepo.create(routeData);
  }

  async findById(id: string): Promise<RouteWithAvailability | null> {
    const route = await this.routeRepo.findByIdWithOperator(id);

    if (!route) {
      return null;
    }

    // Get actual total seats from BusTemplate
    const actualTotalSeats = await this.getActualTotalSeats(route.busTemplateId);

    // Calculate available seats based on departure date (use route's departure time date)
    const departureDate = this.departureDateOf(route.departureTime);
    const availableSeats = await this.calculateAvailableSeats(route.id, departureDate, actualTotalSeats);

    return {
      ...route,
      totalSeats: actualTotalSeats,
      actualTotalSeats,
      availableSeats,
    };
  }

  /**
   * The `@db.Date` day a route departs on. `BookingSeat.departureDate` is a date
   * column, so the time-of-day part must be dropped before comparing.
   */
  private departureDateOf(departureTime: Date): Date {
    return new Date(departureTime.toISOString().split('T')[0]);
  }

  async findMany(query: RouteQuery): Promise<PaginatedResponse<Route>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.RouteWhereInput = this.buildWhereClause(query);
    const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder);

    const [routes, total] = await Promise.all([
      this.routeRepo.findMany({ where, orderBy, skip, take: limit }),
      this.routeRepo.count(where),
    ]);

    return {
      data: routes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Ownership gate for update/delete.
   *
   * ADMIN may act on any route (docs/API-TESTING.md Scenario 4 expects 200 for
   * `PUT`/`DELETE /routes/{any}`). OPERATOR stays restricted to routes they
   * own. Returns whether this was an admin override, for audit metadata.
   *
   * Throws `Error` — not an HTTP-aware type — because `RouteController` maps
   * these messages to status codes by string match; the denied message is kept
   * byte-identical to preserve that mapping.
   */
  private assertCanModify(
    route: Route,
    actor: TokenPayload,
    action: 'update' | 'delete'
  ): { adminOverride: boolean } {
    if (route.operatorId === actor.userId) {
      return { adminOverride: false };
    }

    if (actor.role === UserRole.ADMIN) {
      return { adminOverride: true };
    }

    throw new Error(`Unauthorized: You can only ${action} your own routes`);
  }

  /** Snapshot of the acting user for the audit row; never null (the helper requires a name). */
  private async auditActor(actor: TokenPayload): Promise<string> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: actor.userId },
        select: { firstName: true, lastName: true, email: true },
      });

      const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '';
      return fullName || user?.email || actor.email;
    } catch {
      // Enrichment is best-effort: the request must not fail because the name
      // lookup did, and the token email is always available as a fallback.
      return actor.email;
    }
  }

  private emitAudit(params: {
    action: 'ROUTE_UPDATED' | 'ROUTE_DELETED';
    route: Route;
    actor: TokenPayload;
    actorName: string;
    adminOverride: boolean;
  }): void {
    const { action, route, actor, actorName, adminOverride } = params;

    void writeAuditLog({
      actorId: actor.userId,
      // `writeAuditLog` requires a non-null name; the fallback chain in
      // `auditActor` guarantees one.
      actorName,
      actorRole: actor.role,
      action,
      target: `route:${route.id}`,
      targetId: route.id,
      severity: 'INFO',
      metadata: { adminOverride, operatorId: route.operatorId },
    });
  }

  async update(id: string, actor: TokenPayload, data: UpdateRouteRequest): Promise<Route> {
    const route = await this.routeRepo.findById(id);
    if (!route) {
      throw new Error('Route not found');
    }
    const { adminOverride } = this.assertCanModify(route, actor, 'update');

    const updateData: Prisma.RouteUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.origin !== undefined) updateData.origin = data.origin;
    if (data.destination !== undefined) updateData.destination = data.destination;
    if (data.departureLocation !== undefined) updateData.departureLocation = data.departureLocation;
    if (data.arrivalLocation !== undefined) updateData.arrivalLocation = data.arrivalLocation;
    if (data.distance !== undefined) updateData.distance = data.distance;
    if (data.departureTime !== undefined) updateData.departureTime = new Date(data.departureTime);
    if (data.arrivalTime !== undefined) updateData.arrivalTime = new Date(data.arrivalTime);
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.busType !== undefined) updateData.busType = data.busType;
    if (data.licensePlate !== undefined) updateData.licensePlate = data.licensePlate;
    // totalSeats and availableSeats removed from update
    if (data.price !== undefined) updateData.price = data.price;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.amenities !== undefined) updateData.amenities = JSON.parse(JSON.stringify(data.amenities)) as Prisma.InputJsonValue;
    if (data.pickupPoints !== undefined) updateData.pickupPoints = JSON.parse(JSON.stringify(data.pickupPoints)) as Prisma.InputJsonValue;
    if (data.dropoffPoints !== undefined) updateData.dropoffPoints = JSON.parse(JSON.stringify(data.dropoffPoints)) as Prisma.InputJsonValue;
    if (data.policies !== undefined) updateData.policies = JSON.parse(JSON.stringify(data.policies)) as Prisma.InputJsonValue;
    if (data.images !== undefined) updateData.images = JSON.parse(JSON.stringify(data.images)) as Prisma.InputJsonValue;

    const updated = await this.routeRepo.update(id, updateData);

    const actorName = await this.auditActor(actor);
    this.emitAudit({
      action: 'ROUTE_UPDATED',
      route,
      actor,
      actorName,
      adminOverride,
    });

    return updated;
  }

  async delete(id: string, actor: TokenPayload): Promise<Route> {
    const route = await this.routeRepo.findById(id);
    if (!route) {
      throw new Error('Route not found');
    }
    const { adminOverride } = this.assertCanModify(route, actor, 'delete');

    const deleted = await this.routeRepo.softDelete(id);

    const actorName = await this.auditActor(actor);
    this.emitAudit({
      action: 'ROUTE_DELETED',
      route,
      actor,
      actorName,
      adminOverride,
    });

    return deleted;
  }

  async findByOperator(operatorId: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<Route>> {
    const skip = (page - 1) * limit;
    const [routes, total] = await Promise.all([
      this.routeRepo.findByOperatorId(operatorId, skip, limit),
      this.routeRepo.count({ operatorId }),
    ]);

    return {
      data: routes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Admin (contract Shape 3)
  // ---------------------------------------------------------------------------

  /**
   * `GET /routes/admin/all`.
   *
   * Query budget, independent of row count: count + page select (2), template
   * total seats (1), occupied seats (1). The Seat fallback is a fifth query and
   * is issued only when a referenced template row is missing. A full 100-row
   * page therefore issues **4 queries** normally, 5 at worst — never one per row.
   */
  async findAdminRoutes(query: AdminRouteQuery): Promise<PaginatedResponse<AdminRoute>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where = this.buildAdminWhereClause(query);

    const [rows, total] = await Promise.all([
      this.routeRepo.findAdminMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.routeRepo.countAdmin(where),
    ]);

    const seats = await this.loadSeatData(rows);

    return {
      data: rows.map((row) => this.toAdminRoute(row, seats)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private buildAdminWhereClause(query: AdminRouteQuery): Prisma.RouteWhereInput {
    const where: Prisma.RouteWhereInput = {};

    // Only the admin path may see DELETED rows, and only on request.
    if (query.status) {
      where.status = query.status;
    } else if (!query.includeDeleted) {
      where.status = { not: RouteStatus.DELETED };
    }

    if (query.operatorId) {
      where.operatorId = query.operatorId;
    }

    if (query.q) {
      where.OR = [
        { name: { contains: query.q } },
        { origin: { contains: query.q } },
        { destination: { contains: query.q } },
      ];
    }

    return where;
  }

  /**
   * Seat figures for a whole page in a fixed number of queries.
   *
   * `totalSeats` follows `getActualTotalSeats`: the template's `totalSeats`, with
   * the Seat count only as a fallback. `availableSeats` reuses the
   * `calculateAvailableSeats` rule (BOOKED, or HELD and not yet expired) on the
   * route's own departure day.
   *
   * Seat data is reported unavailable when the route has no `busTemplateId`, or
   * when the template row is gone and no seats exist either — so the admin UI
   * can tell "0 seats" from "unknown".
   */
  private async loadSeatData(
    rows: AdminRouteRow[]
  ): Promise<Map<string, { totalSeats: number | null; availableSeats: number | null }>> {
    const result = new Map<
      string,
      { totalSeats: number | null; availableSeats: number | null }
    >();

    const templateIds = [
      ...new Set(
        rows
          .map((row) => row.busTemplateId)
          .filter((id): id is string => id !== null)
      ),
    ];

    const [templateTotals, occupied] = await Promise.all([
      this.routeRepo.findBusTemplateTotalSeats(templateIds),
      this.routeRepo.countOccupiedSeatsByRoute(rows.map((row) => row.id)),
    ]);

    // Templates with a row but somehow no seat figure still get a Seat-count fallback.
    const missingTemplateIds = templateIds.filter((id) => !templateTotals.has(id));
    const seatFallback = await this.routeRepo.countAvailableSeatDefinitions(missingTemplateIds);

    for (const row of rows) {
      if (!row.busTemplateId) {
        result.set(row.id, { totalSeats: null, availableSeats: null });
        continue;
      }

      const totalSeats =
        templateTotals.get(row.busTemplateId) ?? seatFallback.get(row.busTemplateId) ?? 0;

      if (totalSeats === 0) {
        // Template row absent AND no seat definitions: the count is unknown, not zero.
        result.set(row.id, { totalSeats: null, availableSeats: null });
        continue;
      }

      const occupiedKey = `${row.id}_${this.departureDateOf(row.departureTime).toISOString().split('T')[0]}`;
      const occupiedCount = occupied.get(occupiedKey) ?? 0;

      result.set(row.id, {
        totalSeats,
        availableSeats: Math.max(totalSeats - occupiedCount, 0),
      });
    }

    return result;
  }

  private toAdminRoute(
    row: AdminRouteRow,
    seats: Map<string, { totalSeats: number | null; availableSeats: number | null }>
  ): AdminRoute {
    const seatData = seats.get(row.id) ?? { totalSeats: null, availableSeats: null };

    return {
      id: row.id,
      operatorId: row.operatorId,
      operatorName: `${row.operator.firstName} ${row.operator.lastName}`.trim(),
      name: row.name,
      origin: row.origin,
      destination: row.destination,
      departureTime: row.departureTime,
      busType: row.busType,
      totalSeats: seatData.totalSeats,
      availableSeats: seatData.availableSeats,
      price: row.price.toNumber(),
      status: row.status,
      seatDataAvailable: seatData.totalSeats !== null,
    };
  }

  /**
   * `GET /routes/admin/operators`.
   *
   * Derived from `User` where `role=OPERATOR`; no operator table exists and none
   * is to be created. Query budget: count + page select (2), activeRoutes
   * groupBy (1), booking groupBy (1) + route lookup (1) — **5 queries** for a
   * full page, regardless of operator count.
   */
  async findAdminOperators(query: {
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<AdminOperator>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (query.q) {
      where.OR = [
        { email: { contains: query.q } },
        { firstName: { contains: query.q } },
        { lastName: { contains: query.q } },
        { phone: { contains: query.q } },
      ];
    }

    const [operators, total] = await Promise.all([
      this.routeRepo.findOperators({ where, skip, take: limit }),
      this.routeRepo.countOperators(where),
    ]);

    const operatorIds = operators.map((operator) => operator.id);
    const since = new Date();
    since.setDate(since.getDate() - MONTHLY_WINDOW_DAYS);

    const [activeRoutes, monthlyBookings] = await Promise.all([
      this.routeRepo.countActiveRoutesByOperator(operatorIds),
      this.routeRepo.countBookingsByOperatorSince(operatorIds, since),
    ]);

    return {
      data: operators.map((operator) => ({
        id: operator.id,
        name: `${operator.firstName} ${operator.lastName}`.trim(),
        contactEmail: operator.email,
        activeRoutes: activeRoutes.get(operator.id) ?? 0,
        monthlyBookings: monthlyBookings.get(operator.id) ?? 0,
        // No rating data exists anywhere in the schema (Lead decision, documented gap).
        rating: null,
        status: operator.status,
        createdAt: operator.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private buildWhereClause(query: RouteQuery): Prisma.RouteWhereInput {
    const where: Prisma.RouteWhereInput = {};

    if (query.origin) {
      where.origin = { contains: query.origin };
    }
    if (query.destination) {
      where.destination = { contains: query.destination };
    }
    if (query.departureDate) {
      const date = new Date(query.departureDate);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.departureTime = {
        gte: date,
        lt: nextDay,
      };
    }
    if (query.busType) {
      where.busType = query.busType;
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = query.maxPrice;
      }
    }
    if (query.status) {
      where.status = query.status;
    } else {
      where.status = RouteStatus.ACTIVE;
    }

    return where;
  }

  private buildOrderBy(
    sortBy?: string,
    sortOrder?: string
  ): Prisma.RouteOrderByWithRelationInput {
    const order = sortOrder === 'desc' ? 'desc' : 'asc';

    switch (sortBy) {
      case 'price':
        return { price: order };
      case 'departureTime':
        return { departureTime: order };
      case 'duration':
        return { duration: order };
      case 'createdAt':
        return { createdAt: order };
      default:
        return { departureTime: 'asc' };
    }
  }
}
