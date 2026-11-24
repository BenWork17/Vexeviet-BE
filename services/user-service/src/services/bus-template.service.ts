import type { BusTemplate } from '@prisma/client';
import {
  busTemplateRepository,
  BusTemplateWithSeats,
} from '../repositories/bus-template.repository';

export class BusTemplateService {
  async getAllBusTemplates(): Promise<BusTemplate[]> {
    return busTemplateRepository.findAll();
  }

  async getBusTemplateWithSeats(templateId: string): Promise<BusTemplateWithSeats | null> {
    return busTemplateRepository.findByIdWithSeats(templateId);
  }
}

export const busTemplateService = new BusTemplateService();
