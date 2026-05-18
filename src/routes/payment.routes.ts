import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { validate } from '../middlewares/validate.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { createOrderSchema, verifyPaymentSchema } from '../validators/payment.validator';

const router = Router();

// Webhook is mounted in src/index.ts before JSON parsing so Razorpay HMAC verification receives the raw body.

router.use(authMiddleware);

router.post('/order', validate(createOrderSchema), paymentController.createOrder);
router.post('/verify', validate(verifyPaymentSchema), paymentController.verifyPayment);

export default router;
