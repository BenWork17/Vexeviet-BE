import { Router, IRouter } from 'express';
import { seatController } from '../controllers/seat.controller';

const router: IRouter = Router();

/**
 * @route   GET /api/v1/bus-templates
 * @desc    Get all active bus templates
 * @access  Public
 * 
 * @example GET /api/v1/bus-templates
 */
router.get('/', seatController.getBusTemplates);

/**
 * @route   GET /api/v1/bus-templates/:id
 * @desc    Get bus template by ID with all seats
 * @param   id - UUID of the bus template
 * @access  Public
 * 
 * @example GET /api/v1/bus-templates/xxx-xxx-xxx
 */
router.get('/:id', seatController.getBusTemplateById);

export default router;
