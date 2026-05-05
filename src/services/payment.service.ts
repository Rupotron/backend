import { prisma } from '../config/prisma';
import * as razorpayService from './razorpay.service';

const PLATFORM_FEE_PERCENT = 0.10; // 10%

/**
 * Step 1 — Called by frontend when user clicks "Pay Now"
 * Creates a Razorpay order and initialises the Payment record as INITIATED.
 */
export const createPaymentOrder = async (userId: string, bookingId: string) => {
  // Validate the booking belongs to the user and is in valid state
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true }
  });

  if (!booking) throw { statusCode: 404, message: 'Booking not found' };
  if (booking.userId !== userId) throw { statusCode: 403, message: 'Forbidden' };
  if (booking.status !== 'PENDING') {
    throw { statusCode: 400, message: `Cannot initiate payment for booking with status ${booking.status}` };
  }
  if (booking.expiresAt && new Date() > booking.expiresAt) {
    throw { statusCode: 400, message: 'Booking has expired. Please create a new booking.' };
  }
  // Idempotency: already initiated
  if (booking.payment?.status === 'COMPLETED') {
    throw { statusCode: 400, message: 'Payment is already completed for this booking' };
  }
  if (booking.payment?.razorpayOrderId) {
    // Return existing order to avoid duplicate charges
    console.log(`[Payment] Returning existing Razorpay order for booking ${bookingId}`);
    return { razorpayOrderId: booking.payment.razorpayOrderId, amount: booking.payment.amount };
  }

  const platformFee = parseFloat((booking.totalAmount * PLATFORM_FEE_PERCENT).toFixed(2));
  const partnerEarning = parseFloat((booking.totalAmount - platformFee).toFixed(2));
  const amountInPaise = Math.round(booking.totalAmount * 100);

  // Create Razorpay order (SDK layer)
  const rzpOrder = await razorpayService.createOrder(amountInPaise, bookingId);

  console.log(`[Payment] Razorpay order created: ${rzpOrder.id} for booking ${bookingId}`);

  // Create Payment record — INITIATED state
  const payment = await prisma.payment.create({
    data: {
      bookingId,
      amount: booking.totalAmount,
      platformFee,
      partnerEarning,
      status: 'INITIATED',
      razorpayOrderId: rzpOrder.id
    }
  });

  return {
    razorpayOrderId: payment.razorpayOrderId,
    amount: amountInPaise,
    currency: 'INR'
  };
};

/**
 * Step 2 (Optional/UX) — Frontend-submitted verification.
 * NOT the source of truth. Webhook is authoritative.
 */
export const verifyPayment = async (orderId: string, paymentId: string, signature: string) => {
  const isValid = razorpayService.verifyPaymentSignature(orderId, paymentId, signature);

  if (!isValid) {
    console.warn(`[Payment] Invalid signature for order ${orderId}`);
    throw { statusCode: 400, message: 'Invalid payment signature' };
  }

  // Fetch payment by order ID
  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: orderId }
  });

  if (!payment) throw { statusCode: 404, message: 'Payment record not found' };
  if (payment.status === 'COMPLETED') return { message: 'Payment already confirmed' };

  // Update to COMPLETED (will also be updated by webhook — idempotent)
  await prisma.payment.update({
    where: { razorpayOrderId: orderId },
    data: {
      status: 'COMPLETED',
      razorpayPaymentId: paymentId,
      razorpaySignature: signature
    }
  });

  console.log(`[Payment] Verified and updated payment for order ${orderId}`);
  return { message: 'Payment verified successfully' };
};

/**
 * Step 3 — Webhook Handler. This is THE source of truth.
 * Called by Razorpay directly. Signature verified before reaching here.
 */
export const handleWebhookEvent = async (event: string, payload: any) => {
  console.log(`[Webhook] Event received: ${event}`);

  if (event === 'payment.captured') {
    const rzpPayment = payload?.payment?.entity;
    const orderId: string = rzpPayment?.order_id;
    const paymentId: string = rzpPayment?.id;

    if (!orderId || !paymentId) {
      console.error('[Webhook] Missing order_id or payment_id in payload');
      return;
    }

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: orderId },
      include: { booking: true }
    });

    if (!payment) {
      console.error(`[Webhook] No payment record found for Razorpay order ${orderId}`);
      return;
    }

    // Idempotency: do not reprocess
    if (payment.status === 'COMPLETED') {
      console.log(`[Webhook] Payment ${orderId} already COMPLETED — skipping`);
      return;
    }

    // Concurrent edge case: booking expired before payment captured
    if (payment.booking.status !== 'PENDING') {
      console.warn(`[Webhook] Booking ${payment.bookingId} is no longer PENDING. Marking as REFUND_CANDIDATE`);
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUND_CANDIDATE', razorpayPaymentId: paymentId }
      });
      return;
    }

    // Idempotency: check duplicate paymentId
    const existing = await prisma.payment.findUnique({ where: { razorpayPaymentId: paymentId } });
    if (existing) {
      console.log(`[Webhook] PaymentId ${paymentId} already processed — skipping`);
      return;
    }

    // Mark payment COMPLETED, booking remains PENDING (partner must confirm)
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        razorpayPaymentId: paymentId,
        transactionId: paymentId
      }
    });

    console.log(`[Webhook] ✅ Payment COMPLETED for order ${orderId}, booking ${payment.bookingId} stays PENDING`);
  }

  if (event === 'payment.failed') {
    const rzpPayment = payload?.payment?.entity;
    const orderId: string = rzpPayment?.order_id;

    if (!orderId) return;

    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!payment) return;

    if (payment.status !== 'INITIATED' && payment.status !== 'PENDING') {
      console.log(`[Webhook] Payment ${orderId} already in terminal state — skipping`);
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' }
    });

    console.warn(`[Webhook] ❌ Payment FAILED for order ${orderId}`);
  }
};
