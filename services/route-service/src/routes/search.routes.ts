import { Router, IRouter, RequestHandler } from 'express';
import { searchController } from '../controllers/search.controller';

const router: IRouter = Router();

// POST /api/v1/search/routes - Search routes
router.post('/routes', searchController.search as RequestHandler);

// GET /api/v1/search/popular - Get popular routes
router.get('/popular', searchController.getPopularRoutes as RequestHandler);

// GET /api/v1/search/suggestions - Get autocomplete suggestions
router.get('/suggestions', searchController.getSuggestions as RequestHandler);

export default router;
