import { prisma, Route, RouteStatus, Prisma } from '@vexeviet/database';
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

const CACHE_TTL = 300; // 5 minutes

export class SearchService {
  async searchRoutes(params: SearchRoutesRequest): Promise<PaginatedResponse<Route>> {
    const cacheKey = `search:${cacheService.generateCacheKey(params as unknown as Record<string, unknown>)}`;

    const cached = await cacheService.get<PaginatedResponse<Route>>(cacheKey);
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

    let filteredRoutes = routes;
    if (params.passengers && params.passengers > 0) {
      filteredRoutes = routes.filter((r) => r.availableSeats >= (params.passengers || 1));
    }

    const result: PaginatedResponse<Route> = {
      data: filteredRoutes,
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

  async getPopularRoutes(limit: number = 10): Promise<Route[]> {
    const cacheKey = `popular:routes:${limit}`;

    const cached = await cacheService.get<Route[]>(cacheKey);
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

    await cacheService.set(cacheKey, routes, CACHE_TTL);

    return routes;
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
      select: { [field]: true },
      distinct: [field],
      take: 10,
    });

    const suggestions = routes.map((r) => r[field] as string);

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
