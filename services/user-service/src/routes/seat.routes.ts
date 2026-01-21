import { Router, IRouter } from 'express';
import { seatController } from '../controllers/seat.controller';

const router: IRouter = Router();

/**
 * @route   GET /api/v1/seats/availability
 * @desc    Get seat availability for a route on a specific date
 * @query   routeId - UUID of the route
 * @query   departureDate - Date in YYYY-MM-DD format
 * @access  Public
 * 
 * @example GET /api/v1/seats/availability?routeId=xxx&departureDate=2026-02-15
 */
router.get('/availability', seatController.getAvailability);

/**
 * @route   POST /api/v1/seats/check
 * @desc    Check if specific seats are available
 * @body    { routeId, departureDate, seatNumbers: string[] }
 * @access  Public
 * 
 * @example POST /api/v1/seats/check
 * {
 *   "routeId": "xxx",
 *   "departureDate": "2026-02-15",
 *   "seatNumbers": ["A1", "A2"]
 * }
 */
router.post('/check', seatController.checkAvailability);

export default router;
