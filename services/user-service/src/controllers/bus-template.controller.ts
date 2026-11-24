import { Request, Response, NextFunction } from 'express';
import { busTemplateService } from '../services/bus-template.service';
import { NotFoundError } from '../utils/errors';

export class BusTemplateController {
  getBusTemplates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templates = await busTemplateService.getAllBusTemplates();
      res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  };

  getBusTemplateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const template = await busTemplateService.getBusTemplateWithSeats(id);

      if (!template) {
        throw new NotFoundError('Bus template not found');
      }

      res.status(200).json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const busTemplateController = new BusTemplateController();
