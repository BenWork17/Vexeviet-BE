import { Route, BusType, RouteStatus, Prisma } from '@vexeviet/database';
import { RouteRepository } from '../repositories/route.repository';
import {
  CreateRouteRequest,
  UpdateRouteRequest,
  RouteQuery,
  PaginatedResponse,
} from '../types';

export class RouteService {
  private routeRepo: RouteRepository;

  constructor() {
    this.routeRepo = new RouteRepository();
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
      totalSeats: data.totalSeats || 45,
      availableSeats: data.totalSeats || 45,
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

  async findById(id: string): Promise<Route | null> {
    return this.routeRepo.findByIdWithOperator(id);
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

  async update(id: string, operatorId: string, data: UpdateRouteRequest): Promise<Route> {
    const route = await this.routeRepo.findById(id);
    if (!route) {
      throw new Error('Route not found');
    }
    if (route.operatorId !== operatorId) {
      throw new Error('Unauthorized: You can only update your own routes');
    }

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
    if (data.totalSeats !== undefined) updateData.totalSeats = data.totalSeats;
    if (data.availableSeats !== undefined) updateData.availableSeats = data.availableSeats;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.amenities !== undefined) updateData.amenities = JSON.parse(JSON.stringify(data.amenities)) as Prisma.InputJsonValue;
    if (data.pickupPoints !== undefined) updateData.pickupPoints = JSON.parse(JSON.stringify(data.pickupPoints)) as Prisma.InputJsonValue;
    if (data.dropoffPoints !== undefined) updateData.dropoffPoints = JSON.parse(JSON.stringify(data.dropoffPoints)) as Prisma.InputJsonValue;
    if (data.policies !== undefined) updateData.policies = JSON.parse(JSON.stringify(data.policies)) as Prisma.InputJsonValue;
    if (data.images !== undefined) updateData.images = JSON.parse(JSON.stringify(data.images)) as Prisma.InputJsonValue;

    return this.routeRepo.update(id, updateData);
  }

  async delete(id: string, operatorId: string): Promise<Route> {
    const route = await this.routeRepo.findById(id);
    if (!route) {
      throw new Error('Route not found');
    }
    if (route.operatorId !== operatorId) {
      throw new Error('Unauthorized: You can only delete your own routes');
    }

    return this.routeRepo.softDelete(id);
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
