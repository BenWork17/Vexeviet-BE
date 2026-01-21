import { prisma } from '@vexeviet/database';
import { BusTemplate, Seat, Prisma } from '@prisma/client';

export interface BusTemplateWithSeats extends BusTemplate {
  seats: Seat[];
}

export class BusTemplateRepository {
  /**
   * Find all active bus templates
   */
  async findAll(): Promise<BusTemplate[]> {
    return prisma.busTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find bus template by ID
   */
  async findById(id: string): Promise<BusTemplate | null> {
    return prisma.busTemplate.findUnique({
      where: { id },
    });
  }

  /**
   * Find bus template by ID with all seats
   */
  async findByIdWithSeats(id: string): Promise<BusTemplateWithSeats | null> {
    return prisma.busTemplate.findUnique({
      where: { id },
      include: {
        seats: {
          where: { isAvailable: true },
          orderBy: [
            { floor: 'asc' },
            { rowNumber: 'asc' },
            { columnPosition: 'asc' },
          ],
        },
      },
    });
  }

  /**
   * Find bus template by type
   */
  async findByType(busType: 'STANDARD' | 'VIP' | 'LIMOUSINE' | 'SLEEPER'): Promise<BusTemplate | null> {
    return prisma.busTemplate.findFirst({
      where: { 
        busType,
        isActive: true,
      },
    });
  }

  /**
   * Create a new bus template
   */
  async create(data: Prisma.BusTemplateCreateInput): Promise<BusTemplate> {
    return prisma.busTemplate.create({ data });
  }

  /**
   * Update a bus template
   */
  async update(id: string, data: Prisma.BusTemplateUpdateInput): Promise<BusTemplate> {
    return prisma.busTemplate.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete (deactivate) a bus template
   */
  async deactivate(id: string): Promise<BusTemplate> {
    return prisma.busTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const busTemplateRepository = new BusTemplateRepository();
