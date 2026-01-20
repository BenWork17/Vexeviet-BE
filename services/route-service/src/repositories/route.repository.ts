import { prisma } from '@vexeviet/database';
import { Route, Prisma, RouteStatus } from '@vexeviet/database';

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
}
