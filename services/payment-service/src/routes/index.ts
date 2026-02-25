import { Router, IRouter } from 'express';
import paymentRoutes from './payment.routes';
import webhookRoutes from './webhook.routes';

const router: IRouter = Router();

router.use('/payments', paymentRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
