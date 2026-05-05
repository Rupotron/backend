import { z } from 'zod';

export const createOrderSchema = z.object({
  bookingId: z.string().uuid()
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string()
});
