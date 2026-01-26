import { prisma, Route, RouteStatus, SeatStatus, Prisma } from '@vexeviet/database';
import { cacheService } from './cache.service';
import { BusType, PaginatedResponse } from '../types';

export interface SearchRoutesRequest {
  origin: string;
  destination: string;
  departureDate?: string;
  passengers?: number;
  busType?: BusType;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price' | 'departureTime' | 'duration';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

// Extended Route type with computed availableSeats
type RouteWithAvailability = Route & {
  availableSeats: number;
  actualTotalSeats: number; // Total seats from BusTemplate (actual selectable seats)
};

const CACHE_TTL = 60; // Reduced to 1 minute for more accurate seat availability

export class SearchService {
  /**
   * Get actual total seats from BusTemplate for routes
   * This counts only seats with isAvailable=true in the Seat table
   */
  private async getActualTotalSeatsForRoutes(
    routes: Array<{ id: string; busTemplateId: string | null }>
  ): Promise<Map<string, number>> {
    const totalSeatsMap = new Map<string, number>();

    if (routes.length === 0) {
      return totalSeatsMap;
    }

    // Get unique busTemplateIds
    const busTemplateIds = routes
      .map(r => r.busTemplateId)
      .filter((id): id is string => id !== null);

    if (busTemplateIds.length === 0) {
      return totalSeatsMap;
    }

    // Count actual available seats per template
    const templateSeatCounts = await prisma.seat.groupBy({
      by: ['busTemplateId'],
      where: {
        busTemplateId: { in: busTemplateIds },
        isAvailable: true,
      },
      _count: {
        id: true,
      },
    });

    // Create map: busTemplateId -> actualSeatCount
    const templateCountMap = new Map<string, number>();
    for (const template of templateSeatCounts) {
      templateCountMap.set(template.busTemplateId, template._count.id);
    }

    // Map routes to their actual seat counts
    for (const route of routes) {
      if (route.busTemplateId) {
        const actualSeats = templateCountMap.get(route.busTemplateId) || 0;
        totalSeatsMap.set(route.id, actualSeats);
      }
    }

    return totalSeatsMap;
  }

  /**
   * Calculate available seats for multiple routes in batch
   * Uses actual seat count from BusTemplate instead of Route.totalSeats
   */
  private async calculateAvailableSeatsForRoutes(
    routes: Array<Route & { busTemplateId: string | null }>,
    departureDate?: string
  ): Promise<{ availabilityMap: Map<string, number>; actualTotalSeatsMap: Map<string, number> }> {
    const availabilityMap = new Map<string, number>();
    const actualTotalSeatsMap = new Map<string, number>();

    if (routes.length === 0) {
      return { availabilityMap, actualTotalSeatsMap };
    }

    // Get actual total seats from BusTemplate
    const totalSeatsFromTemplate = await this.getActualTotalSeatsForRoutes(routes);

    // If no specific departure date, use each route's departure time
    const routeData = routes.map(r => ({
      routeId: r.id,
      departureDate: departureDate
        ? new Date(departureDate)
        : new Date(r.departureTime.toISOString().split('T')[0]),
      // Use actual seats from template
      totalSeats: totalSeatsFromTemplate.get(r.id) || 0,
    }));

    // Store actual total seats
    for (const route of routeData) {
      actualTotalSeatsMap.set(route.routeId, route.totalSeats);
    }

    // Batch query: Get all occupied seats for these routes
    const occupiedSeats = await prisma.bookingSeat.groupBy({
      by: ['routeId', 'departureDate'],
      where: {
        routeId: { in: routes.map(r => r.id) },
        OR: [
          { status: SeatStatus.BOOKED },
          {
            status: SeatStatus.HELD,
            lockedUntil: { gt: new Date() },
          },
        ],
      },
      _count: {
        id: true,
      },
    });

    // Create a lookup map for occupied seats
    const occupiedMap = new Map<string, number>();
    for (const seat of occupiedSeats) {
      // Key format: routeId_departureDate (date only, no time)
      const dateKey = seat.departureDate.toISOString().split('T')[0];
      const key = `${seat.routeId}_${dateKey}`;
      occupiedMap.set(key, seat._count.id);
    }

    // Calculate available seats for each route
    for (const route of routeData) {
      const dateKey = route.departureDate.toISOString().split('T')[0];
      const key = `${route.routeId}_${dateKey}`;
      const occupiedCount = occupiedMap.get(key) || 0;
      availabilityMap.set(route.routeId, route.totalSeats - occupiedCount);
    }

    return { availabilityMap, actualTotalSeatsMap };
  }

  async searchRoutes(params: SearchRoutesRequest): Promise<PaginatedResponse<RouteWithAvailability>> {
    const cacheKey = `search:${cacheService.generateCacheKey(params as unknown as Record<string, unknown>)}`;

    const cached = await cacheService.get<PaginatedResponse<RouteWithAvailability>>(cacheKey);
    if (cached) {
      console.log('Cache HIT for search:', cacheKey);
      return cached;
    }

    console.log('Cache MISS for search:', cacheKey);

    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 100);
    const skip = (page - 1) * pageSize;

    const where = this.buildWhereClause(params);
    const orderBy = this.buildOrderBy(params.sortBy, params.sortOrder);

    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          operator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.route.count({ where }),
    ]);

    // Calculate real-time available seats for all routes (using BusTemplate actual seats)
    const { availabilityMap, actualTotalSeatsMap } = await this.calculateAvailableSeatsForRoutes(
      routes,
      params.departureDate
    );

    // Map routes with computed availableSeats and actualTotalSeats
    let routesWithAvailability: RouteWithAvailability[] = routes.map(route => {
      // Lấy actualTotalSeats từ BusTemplate
      const finalTotalSeats = actualTotalSeatsMap.get(route.id) ?? 0;
      
      return {
        ...route,
        totalSeats: finalTotalSeats, // Hiển thị 42
        actualTotalSeats: finalTotalSeats,
        availableSeats: availabilityMap.get(route.id) ?? finalTotalSeats,
      };
    });

    // Filter by passenger count using computed availableSeats
    if (params.passengers && params.passengers > 0) {
      routesWithAvailability = routesWithAvailability.filter(
        (r) => r.availableSeats >= (params.passengers || 1)
      );
    }

    const result: PaginatedResponse<RouteWithAvailability> = {
      data: routesWithAvailability,
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    await cacheService.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  async getPopularRoutes(limit: number = 10): Promise<RouteWithAvailability[]> {
    const cacheKey = `popular:routes:${limit}`;

    const cached = await cacheService.get<RouteWithAvailability[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const routes = await prisma.route.findMany({
      where: {
        status: RouteStatus.ACTIVE,
        departureTime: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Calculate real-time available seats for popular routes (using BusTemplate actual seats)
    const { availabilityMap, actualTotalSeatsMap } = await this.calculateAvailableSeatsForRoutes(routes);

    const routesWithAvailability: RouteWithAvailability[] = routes.map(route => {
      const finalTotalSeats = actualTotalSeatsMap.get(route.id) ?? 0;
      
      return {
        ...route,
        totalSeats: finalTotalSeats, // Hiển thị 42
        actualTotalSeats: finalTotalSeats,
        availableSeats: availabilityMap.get(route.id) ?? finalTotalSeats,
      };
    });

    await cacheService.set(cacheKey, routesWithAvailability, CACHE_TTL);

    return routesWithAvailability;
  }

  async getSuggestions(query: string, field: 'origin' | 'destination'): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const cacheKey = `suggestions:${field}:${query.toLowerCase()}`;

    const cached = await cacheService.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const routes = await prisma.route.findMany({
      where: {
        status: RouteStatus.ACTIVE,
        [field]: { contains: query },
      },
      select: { origin: true, destination: true },
      distinct: [field],
      take: 10,
    });

    const suggestions = routes.map((r) => field === 'origin' ? r.origin : r.destination);

    await cacheService.set(cacheKey, suggestions, 600);

    return suggestions;
  }

  private buildWhereClause(params: SearchRoutesRequest): Prisma.RouteWhereInput {
    const where: Prisma.RouteWhereInput = {
      status: RouteStatus.ACTIVE,
    };

    if (params.origin) {
      where.origin = { contains: params.origin };
    }

    if (params.destination) {
      where.destination = { contains: params.destination };
    }

    if (params.departureDate) {
      const date = new Date(params.departureDate);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      where.departureTime = {
        gte: date,
        lt: nextDay,
      };
    } else {
      where.departureTime = { gte: new Date() };
    }

    if (params.busType) {
      where.busType = params.busType;
    }

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      where.price = {};
      if (params.minPrice !== undefined) {
        where.price.gte = params.minPrice;
      }
      if (params.maxPrice !== undefined) {
        where.price.lte = params.maxPrice;
      }
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
      default:
        return { departureTime: 'asc' };
    }
  }
}

export const searchService = new SearchService();
