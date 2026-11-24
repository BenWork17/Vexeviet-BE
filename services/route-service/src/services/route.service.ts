import {
  Route,
  BusType,
  RouteStatus,
  ReviewStatus,
  SeatStatus,
  Prisma,
  prisma,
  UserRole,
  writeAuditLog,
} from '@vexeviet/database';
import { RouteRepository } from '../repositories/route.repository';
import { RouteAdminService } from './route-admin.service';
import {
  CreateRouteRequest,
  UpdateRouteRequest,
  RouteQuery,
  AdminRouteQuery,
  AdminRoute,
  AdminOperator,
  OperatorRoute,
  PaginatedResponse,
  TokenPayload,
} from '../types';

export type RouteWithAvailability = Route & {
  totalSeats: number;
  availableSeats: number;
  actualTotalSeats: number;
  operator?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    rating?: number | null;
    reviewCount?: number;
  };
};

export class RouteService {
  private routeRepo: RouteRepository;
  private adminService: RouteAdminService;

  constructor() {
    this.routeRepo = new RouteRepository();
    this.adminService = new RouteAdminService(this.routeRepo);
  }

  private async getActualTotalSeats(busTemplateId: string | null): Promise<number> {
    if (!busTemplateId) {
      return 0;
    }

    const template = await prisma.busTemplate.findUnique({
      where: { id: busTemplateId },
      select: { totalSeats: true },
    });

    if (template) {
      return template.totalSeats;
    }

    return prisma.seat.count({
      where: {
        busTemplateId,
        isAvailable: true,
      },
    });
  }

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

  private async requireActiveBusTemplate(busTemplateId: string): Promise<void> {
    if (typeof busTemplateId !== 'string' || busTemplateId.trim().length === 0) {
      throw new Error('busTemplateId does not reference an existing, active bus template');
    }

    const template = await prisma.busTemplate.findFirst({
      where: { id: busTemplateId, isActive: true },
      select: { id: true },
    });

    if (!template) {
      throw new Error('busTemplateId does not reference an existing, active bus template');
    }
  }

  async create(operatorId: string, data: CreateRouteRequest): Promise<Route> {
    await this.requireActiveBusTemplate(data.busTemplateId);

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
      price: data.price,
      amenities: data.amenities
        ? (JSON.parse(JSON.stringify(data.amenities)) as Prisma.InputJsonValue)
        : undefined,
      pickupPoints: data.pickupPoints
        ? (JSON.parse(JSON.stringify(data.pickupPoints)) as Prisma.InputJsonValue)
        : undefined,
      dropoffPoints: data.dropoffPoints
        ? (JSON.parse(JSON.stringify(data.dropoffPoints)) as Prisma.InputJsonValue)
        : undefined,
      policies: data.policies
        ? (JSON.parse(JSON.stringify(data.policies)) as Prisma.InputJsonValue)
        : undefined,
      images: data.images
        ? (JSON.parse(JSON.stringify(data.images)) as Prisma.InputJsonValue)
        : undefined,
      operator: { connect: { id: operatorId } },
      busTemplate: { connect: { id: data.busTemplateId } },
    };

    return this.routeRepo.create(routeData);
  }

  async findById(id: string): Promise<RouteWithAvailability | null> {
    const route = await this.routeRepo.findByIdWithOperator(id);
    if (!route) {
      return null;
    }

    const actualTotalSeats = await this.getActualTotalSeats(route.busTemplateId);
    const departureDate = this.departureDateOf(route.departureTime);

    const [availableSeats, reviewAgg] = await Promise.all([
      this.calculateAvailableSeats(route.id, departureDate, actualTotalSeats),
      prisma.operatorReview.aggregate({
        where: {
          operatorId: route.operatorId,
          status: ReviewStatus.VISIBLE,
        },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    const reviewCount = reviewAgg._count.id;
    const rating =
      reviewCount > 0 && reviewAgg._avg.rating !== null
        ? Math.round(reviewAgg._avg.rating * 10) / 10
        : null;

    return {
      ...route,
      operator: {
        ...route.operator,
        rating,
        reviewCount,
      },
      totalSeats: actualTotalSeats,
      actualTotalSeats,
      availableSeats,
    };
  }

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

  private async auditActor(actor: TokenPayload): Promise<string> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: actor.userId },
        select: { firstName: true, lastName: true, email: true },
      });
      const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '';
      return fullName || user?.email || actor.email;
    } catch {
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
    if (data.price !== undefined) updateData.price = data.price;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.amenities !== undefined)
      updateData.amenities = JSON.parse(JSON.stringify(data.amenities)) as Prisma.InputJsonValue;
    if (data.pickupPoints !== undefined)
      updateData.pickupPoints = JSON.parse(JSON.stringify(data.pickupPoints)) as Prisma.InputJsonValue;
    if (data.dropoffPoints !== undefined)
      updateData.dropoffPoints = JSON.parse(JSON.stringify(data.dropoffPoints)) as Prisma.InputJsonValue;
    if (data.policies !== undefined)
      updateData.policies = JSON.parse(JSON.stringify(data.policies)) as Prisma.InputJsonValue;
    if (data.images !== undefined)
      updateData.images = JSON.parse(JSON.stringify(data.images)) as Prisma.InputJsonValue;

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

  async findByOperator(
    operatorId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<OperatorRoute>> {
    return this.adminService.findByOperator(operatorId, page, limit);
  }

  async findAdminRoutes(query: AdminRouteQuery): Promise<PaginatedResponse<AdminRoute>> {
    return this.adminService.findAdminRoutes(query);
  }

  async findAdminOperators(query: {
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<AdminOperator>> {
    return this.adminService.findAdminOperators(query);
  }

  private buildWhereClause(query: RouteQuery): Prisma.RouteWhereInput {
    const where: Prisma.RouteWhereInput = {};

    if (query.origin) where.origin = { contains: query.origin };
    if (query.destination) where.destination = { contains: query.destination };
    if (query.departureDate) {
      const date = new Date(query.departureDate);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.departureTime = { gte: date, lt: nextDay };
    }
    if (query.busType) where.busType = query.busType;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }
    where.status = query.status ? query.status : RouteStatus.ACTIVE;

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
