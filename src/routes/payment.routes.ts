import { Router, raw } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { validate } from '../middlewares/validate.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { createOrderSchema, verifyPaymentSchema } from '../validators/payment.validator';

const router = Router();

/**
 * POST /api/v1/payment/webhook
 * ─────────────────────────────
 * MUST be registered BEFORE express.json() on this router.
 * express.raw() preserves the raw Buffer needed for HMAC signature verification.
 * If JSON is parsed first, signature verification will ALWAYS fail.
 */
router.post('/webhook', raw({ type: 'application/json' }), paymentController.handleWebhook);

// All routes below require authentication
router.use(authMiddleware);

router.post('/order', validate(createOrderSchema), paymentController.createOrder);
router.post('/verify', validate(verifyPaymentSchema), paymentController.verifyPayment);

export default router;
