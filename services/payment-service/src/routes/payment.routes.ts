import { Router, IRouter } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { validateCreatePayment, validateRefund } from '../validators/payment.validator';

const router: IRouter = Router();

router.post('/', validateCreatePayment, paymentController.createPayment);

router.get('/status', paymentController.getPaymentStatusByTransactionRef);

router.get('/booking/:bookingId', paymentController.getPaymentsByBooking);

router.get('/:paymentId', paymentController.getPayment);

router.post('/:paymentId/cancel', paymentController.cancelPayment);

router.post('/refund', validateRefund, paymentController.processRefund);

export default router;
