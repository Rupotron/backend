/**
 * razorpay.service.ts
 * ---------------------
 * SDK Isolation Layer — all Razorpay SDK calls live here.
 * Swap this file when migrating to Stripe, PayU, etc.
 */
import Razorpay from 'razorpay';
import crypto from 'crypto';

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

/**
 * Create a Razorpay order.
 * @param amountInPaise - amount in smallest currency unit (paise for INR)
 * @param receiptId - internal booking ID used as receipt reference
 */
export const createOrder = async (amountInPaise: number, receiptId: string) => {
  return rzp.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: receiptId,
    payment_capture: true
  } as any);
};

/**
 * Verify Razorpay webhook HMAC signature.
 * CRITICAL: Must use the raw request body buffer — NOT parsed JSON.
 */
export const verifyWebhookSignature = (rawBody: Buffer, signature: string): boolean => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
};

/**
 * Verify frontend-submitted payment signature (UX-only, NOT source of truth).
 */
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
};
