import { Request, Response } from 'express';
import { seatService } from '../services/seat.service';

export class SeatController {
  /**
   * GET /api/v1/seats/availability
   * Get seat availability for a route on a specific date
   */
  getAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { routeId, departureDate } = req.query;

      // Validate required params
      if (!routeId || typeof routeId !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'routeId is required',
          },
        });
        return;
      }

      if (!departureDate || typeof departureDate !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'departureDate is required (format: YYYY-MM-DD)',
          },
        });
        return;
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(departureDate)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'departureDate must be in YYYY-MM-DD format',
          },
        });
        return;
      }

      const result = await seatService.getSeatAvailability(routeId, departureDate);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get seat availability';
      
      if (message === 'ROUTE_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: {
            code: 'ROUTE_NOT_FOUND',
            message: 'Route not found',
          },
        });
        return;
      }

      if (message === 'BUS_TEMPLATE_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: {
            code: 'BUS_TEMPLATE_NOT_FOUND',
            message: 'Bus template not configured for this route',
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
        },
      });
    }
  };

  /**
   * POST /api/v1/seats/check
   * Check if specific seats are available
   */
  checkAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { routeId, departureDate, seatNumbers } = req.body;

      // Validate required fields
      if (!routeId || !departureDate || !seatNumbers || !Array.isArray(seatNumbers)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'routeId, departureDate, and seatNumbers[] are required',
          },
        });
        return;
      }

      const result = await seatService.checkSeatsAvailable(routeId, departureDate, seatNumbers);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to check seat availability',
        },
      });
    }
  };

  /**
   * GET /api/v1/bus-templates
   * Get all bus templates
   */
  getBusTemplates = async (_req: Request, res: Response): Promise<void> => {
    try {
      const templates = await seatService.getAllBusTemplates();

      res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get bus templates',
        },
      });
    }
  };

  /**
   * GET /api/v1/bus-templates/:id
   * Get bus template with seats
   */
  getBusTemplateById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const template = await seatService.getBusTemplateWithSeats(id);

      if (!template) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Bus template not found',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: template,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get bus template',
        },
      });
    }
  };
}

export const seatController = new SeatController();
