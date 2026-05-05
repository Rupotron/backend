import { Request, Response } from 'express';
import * as paymentService from '../services/payment.service';
import * as razorpayService from '../services/razorpay.service';
import { emitAdminPaymentUpdated } from '../config/socket';

export const createOrder = async (req: Request, res: Response) => {
  const { bookingId } = req.body;
  const result = await paymentService.createPaymentOrder(req.user!.userId, bookingId);
  res.status(201).json(result);
};

export const verifyPayment = async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const result = await paymentService.verifyPayment(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );
  emitAdminPaymentUpdated(result);
  res.status(200).json(result);
};

/**
 * Webhook — must receive raw body for HMAC to work correctly.
 * Express.raw() is mounted only on this route.
 */
export const handleWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;

  if (!signature) {
    console.warn('[Webhook] Missing X-Razorpay-Signature header');
    res.status(400).json({ message: 'Missing signature' });
    return;
  }

  const rawBody = req.body as Buffer;

  const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);

  if (!isValid) {
    console.error('[Webhook] HMAC signature mismatch — possible spoofing attempt');
    res.status(400).json({ message: 'Invalid webhook signature' });
    return;
  }

  const payload = JSON.parse(rawBody.toString());
  const event: string = payload.event;

  // Acknowledge Razorpay IMMEDIATELY — then process async
  res.status(200).json({ received: true });

  await paymentService.handleWebhookEvent(event, payload);
};
