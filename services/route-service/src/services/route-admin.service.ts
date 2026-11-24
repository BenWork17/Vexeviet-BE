import { Prisma, RouteStatus } from '@vexeviet/database';
import { RouteRepository, AdminRouteRow } from '../repositories/route.repository';
import {
  AdminOperator,
  AdminRoute,
  AdminRouteQuery,
  OperatorRoute,
  PaginatedResponse,
} from '../types';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MONTHLY_WINDOW_DAYS = 30;

export class RouteAdminService {
  private routeRepo: RouteRepository;

  constructor(routeRepo = new RouteRepository()) {
    this.routeRepo = routeRepo;
  }

  private departureDateOf(departureTime: Date): Date {
    return new Date(departureTime.toISOString().split('T')[0]);
  }

  async findByOperator(
    operatorId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<OperatorRoute>> {
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.routeRepo.findOperatorPage(operatorId, skip, limit),
      this.routeRepo.countOperatorRoutes(operatorId),
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
        avatarUrl: operator.operatorAvatarUrl ?? null,
        activeRoutes: activeRoutes.get(operator.id) ?? 0,
        monthlyBookings: monthlyBookings.get(operator.id) ?? 0,
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

  private buildAdminWhereClause(query: AdminRouteQuery): Prisma.RouteWhereInput {
    const where: Prisma.RouteWhereInput = {};

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

  private async loadSeatData(
    rows: AdminRouteRow[]
  ): Promise<Map<string, { totalSeats: number | null; availableSeats: number | null }>> {
    const result = new Map<
      string,
      { totalSeats: number | null; availableSeats: number | null }
    >();

    const templateIds = [
      ...new Set(
        rows.map((row) => row.busTemplateId).filter((id): id is string => id !== null)
      ),
    ];

    const [templateTotals, occupied] = await Promise.all([
      this.routeRepo.findBusTemplateTotalSeats(templateIds),
      this.routeRepo.countOccupiedSeatsByRoute(rows.map((row) => row.id)),
    ]);

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
      hasBusTemplate: row.busTemplateId !== null,
    };
  }
}
