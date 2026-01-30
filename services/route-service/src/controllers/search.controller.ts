import { Request, Response } from 'express';
import { searchService, SearchRoutesRequest } from '../services/search.service';
import { BusType } from '../types';

interface SearchRequestBody {
  origin?: string;
  destination?: string;
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

export class SearchController {
  search = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as SearchRequestBody;
      const params: SearchRoutesRequest = {
        origin: body.origin ?? '',
        destination: body.destination ?? '',
        departureDate: body.departureDate,
        passengers: body.passengers,
        busType: body.busType,
        minPrice: body.minPrice,
        maxPrice: body.maxPrice,
        sortBy: body.sortBy,
        sortOrder: body.sortOrder,
        page: body.page ?? 1,
        pageSize: body.pageSize ?? 20,
      };

      if (!params.origin || !params.destination) {
        res.status(400).json({
          success: false,
          error: 'Origin and destination are required',
        });
        return;
      }

      const result = await searchService.searchRoutes(params);

      res.status(200).json({
        success: true,
        data: result.data,
        routes: result.data, // Keep for FE compatibility
        total: result.pagination.total,
        page: result.pagination.page,
        pageSize: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  };

  getPopularRoutes = async (req: Request, res: Response): Promise<void> => {
    try {
      const limitParam = req.query.limit;
      const limit = limitParam && typeof limitParam === 'string' ? parseInt(limitParam, 10) : 10;
      const routes = await searchService.getPopularRoutes(isNaN(limit) ? 10 : limit);

      res.status(200).json({
        success: true,
        data: routes,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get popular routes',
      });
    }
  };

  getSuggestions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, q, field } = req.query;
      const searchQuery = (query || q) as string;

      if (!searchQuery || typeof searchQuery !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Query parameter is required',
        });
        return;
      }

      const fieldType = field === 'destination' ? 'destination' : 'origin';
      const suggestions = await searchService.getSuggestions(searchQuery, fieldType);

      res.status(200).json({
        success: true,
        suggestions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get suggestions',
      });
    }
  };
}

export const searchController = new SearchController();
