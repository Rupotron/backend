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
    console.error('[Webhook] HMAC signature mismatch. Possible spoofing attempt.');
    res.status(400).json({ message: 'Invalid webhook signature' });
    return;
  }

  let payload: { event?: string };
  try {
    payload = JSON.parse(rawBody.toString());
  } catch {
    res.status(400).json({ message: 'Invalid webhook payload' });
    return;
  }

  const event = payload.event;
  if (!event) {
    res.status(400).json({ message: 'Missing webhook event' });
    return;
  }

  res.status(200).json({ received: true });

  void paymentService.handleWebhookEvent(event, payload).catch((error) => {
    console.error('[Webhook] Async processing failed', error);
  });
};
