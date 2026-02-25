import { Router, IRouter } from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router: IRouter = Router();

router.get('/vnpay/return', webhookController.vnpayReturn);

router.get('/vnpay/ipn', webhookController.vnpayIPN);

router.post('/momo', webhookController.momoWebhook);

router.post('/zalopay', webhookController.zalopayWebhook);

export default router;
