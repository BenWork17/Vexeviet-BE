import { Router, IRouter } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import seatRoutes from './seat.routes';
import busTemplateRoutes from './bus-template.routes';
import auditLogRoutes from './audit-log.routes';

const router: IRouter = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/seats', seatRoutes);
router.use('/bus-templates', busTemplateRoutes);
router.use('/audit-logs', auditLogRoutes);

export default router;
