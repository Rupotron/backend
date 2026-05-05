"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhookEvent = exports.verifyPayment = exports.createPaymentOrder = void 0;
const prisma_1 = require("../config/prisma");
const razorpayService = __importStar(require("./razorpay.service"));
const PLATFORM_FEE_PERCENT = 0.10; // 10%
/**
 * Step 1 — Called by frontend when user clicks "Pay Now"
 * Creates a Razorpay order and initialises the Payment record as INITIATED.
 */
const createPaymentOrder = async (userId, bookingId) => {
    // Validate the booking belongs to the user and is in valid state
    const booking = await prisma_1.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { payment: true }
    });
    if (!booking)
        throw { statusCode: 404, message: 'Booking not found' };
    if (booking.userId !== userId)
        throw { statusCode: 403, message: 'Forbidden' };
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
    const payment = await prisma_1.prisma.payment.create({
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
exports.createPaymentOrder = createPaymentOrder;
/**
 * Step 2 (Optional/UX) — Frontend-submitted verification.
 * NOT the source of truth. Webhook is authoritative.
 */
const verifyPayment = async (orderId, paymentId, signature) => {
    const isValid = razorpayService.verifyPaymentSignature(orderId, paymentId, signature);
    if (!isValid) {
        console.warn(`[Payment] Invalid signature for order ${orderId}`);
        throw { statusCode: 400, message: 'Invalid payment signature' };
    }
    // Fetch payment by order ID
    const payment = await prisma_1.prisma.payment.findUnique({
        where: { razorpayOrderId: orderId }
    });
    if (!payment)
        throw { statusCode: 404, message: 'Payment record not found' };
    if (payment.status === 'COMPLETED')
        return { message: 'Payment already confirmed' };
    // Update to COMPLETED (will also be updated by webhook — idempotent)
    await prisma_1.prisma.payment.update({
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
exports.verifyPayment = verifyPayment;
/**
 * Step 3 — Webhook Handler. This is THE source of truth.
 * Called by Razorpay directly. Signature verified before reaching here.
 */
const handleWebhookEvent = async (event, payload) => {
    console.log(`[Webhook] Event received: ${event}`);
    if (event === 'payment.captured') {
        const rzpPayment = payload?.payment?.entity;
        const orderId = rzpPayment?.order_id;
        const paymentId = rzpPayment?.id;
        if (!orderId || !paymentId) {
            console.error('[Webhook] Missing order_id or payment_id in payload');
            return;
        }
        const payment = await prisma_1.prisma.payment.findUnique({
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
            await prisma_1.prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'REFUND_CANDIDATE', razorpayPaymentId: paymentId }
            });
            return;
        }
        // Idempotency: check duplicate paymentId
        const existing = await prisma_1.prisma.payment.findUnique({ where: { razorpayPaymentId: paymentId } });
        if (existing) {
            console.log(`[Webhook] PaymentId ${paymentId} already processed — skipping`);
            return;
        }
        // Mark payment COMPLETED, booking remains PENDING (partner must confirm)
        await prisma_1.prisma.payment.update({
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
        const orderId = rzpPayment?.order_id;
        if (!orderId)
            return;
        const payment = await prisma_1.prisma.payment.findUnique({ where: { razorpayOrderId: orderId } });
        if (!payment)
            return;
        if (payment.status !== 'INITIATED' && payment.status !== 'PENDING') {
            console.log(`[Webhook] Payment ${orderId} already in terminal state — skipping`);
            return;
        }
        await prisma_1.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' }
        });
        console.warn(`[Webhook] ❌ Payment FAILED for order ${orderId}`);
    }
};
exports.handleWebhookEvent = handleWebhookEvent;
