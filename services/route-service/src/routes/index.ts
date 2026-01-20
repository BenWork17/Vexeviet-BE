import { Router, IRouter } from 'express';
import routeRoutes from './route.routes';
import searchRoutes from './search.routes';

const router: IRouter = Router();

router.use('/routes', routeRoutes);
router.use('/search', searchRoutes);

export default router;
