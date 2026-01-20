import { Router, IRouter } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';

const router: IRouter = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router;
