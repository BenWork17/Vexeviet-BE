import { Router, IRouter } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import seatRoutes from './seat.routes';
import busTemplateRoutes from './bus-template.routes';

const router: IRouter = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/seats', seatRoutes);
router.use('/bus-templates', busTemplateRoutes);

export default router;
