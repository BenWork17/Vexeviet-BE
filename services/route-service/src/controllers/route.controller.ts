import { Request, Response } from 'express';
import { RouteService } from '../services/route.service';
import {
  CreateRouteRequest,
  UpdateRouteRequest,
  RouteQuery,
  TokenPayload,
  BusType,
  RouteStatus,
} from '../types';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export class RouteController {
  private routeService: RouteService;

  constructor() {
    this.routeService = new RouteService();
  }

  create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const data = req.body as CreateRouteRequest;
      const route = await this.routeService.create(req.user.userId, data);

      res.status(201).json({
        success: true,
        data: route,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create route',
      });
    }
  };

  findAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const query: RouteQuery = {
        origin: req.query.origin as string,
        destination: req.query.destination as string,
        departureDate: req.query.departureDate as string,
        busType: req.query.busType as BusType,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        status: req.query.status as RouteStatus,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
        sortBy: req.query.sortBy as RouteQuery['sortBy'],
        sortOrder: req.query.sortOrder as RouteQuery['sortOrder'],
      };

      const result = await this.routeService.findMany(query);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch routes',
      });
    }
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const route = await this.routeService.findById(id);

      if (!route) {
        res.status(404).json({
          success: false,
          error: 'Route not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: route,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch route',
      });
    }
  };

  update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const data = req.body as UpdateRouteRequest;
      const route = await this.routeService.update(id, req.user.userId, data);

      res.status(200).json({
        success: true,
        data: route,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update route';
      const status = message.includes('not found') ? 404 : message.includes('Unauthorized') ? 403 : 400;

      res.status(status).json({
        success: false,
        error: message,
      });
    }
  };

  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      await this.routeService.delete(id, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Route deleted successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete route';
      const status = message.includes('not found') ? 404 : message.includes('Unauthorized') ? 403 : 400;

      res.status(status).json({
        success: false,
        error: message,
      });
    }
  };

  findMyRoutes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await this.routeService.findByOperator(req.user.userId, page, limit);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch routes',
      });
    }
  };
}
