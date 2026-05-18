/**
 * razorpay.service.ts
 * ---------------------
 * SDK Isolation Layer — all Razorpay SDK calls live here.
 * Swap this file when migrating to Stripe, PayU, etc.
 */
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getRequiredEnv } from '../config/env';

let rzp: Razorpay | null = null;

const getRazorpay = () => {
  if (!rzp) {
    rzp = new Razorpay({
      key_id: getRequiredEnv('razorpayKeyId'),
      key_secret: getRequiredEnv('razorpayKeySecret'),
    });
  }
  return rzp;
};

/**
 * Create a Razorpay order.
 * @param amountInPaise - amount in smallest currency unit (paise for INR)
 * @param receiptId - internal booking ID used as receipt reference
 */
export const createOrder = async (amountInPaise: number, receiptId: string) => {
  return getRazorpay().orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: receiptId,
    payment_capture: true
  });
};

/**
 * Verify Razorpay webhook HMAC signature.
 * CRITICAL: Must use the raw request body buffer — NOT parsed JSON.
 */
export const verifyWebhookSignature = (rawBody: Buffer, signature: string): boolean => {
  const secret = getRequiredEnv('razorpayWebhookSecret');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  const provided = Buffer.from(signature, 'hex');
  const expected = Buffer.from(expectedSignature, 'hex');
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    expected,
    provided
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
  const secret = getRequiredEnv('razorpayKeySecret');
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  const provided = Buffer.from(signature, 'hex');
  const expected = Buffer.from(expectedSignature, 'hex');
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    expected,
    provided
  );
};
