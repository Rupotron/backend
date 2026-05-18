"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaymentSignature = exports.verifyWebhookSignature = exports.createOrder = void 0;
/**
 * razorpay.service.ts
 * ---------------------
 * SDK Isolation Layer — all Razorpay SDK calls live here.
 * Swap this file when migrating to Stripe, PayU, etc.
 */
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
let rzp = null;
const getRazorpay = () => {
    if (!rzp) {
        rzp = new razorpay_1.default({
            key_id: (0, env_1.getRequiredEnv)('razorpayKeyId'),
            key_secret: (0, env_1.getRequiredEnv)('razorpayKeySecret'),
        });
    }
    return rzp;
};
/**
 * Create a Razorpay order.
 * @param amountInPaise - amount in smallest currency unit (paise for INR)
 * @param receiptId - internal booking ID used as receipt reference
 */
const createOrder = async (amountInPaise, receiptId) => {
    return getRazorpay().orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        payment_capture: true
    });
};
exports.createOrder = createOrder;
/**
 * Verify Razorpay webhook HMAC signature.
 * CRITICAL: Must use the raw request body buffer — NOT parsed JSON.
 */
const verifyWebhookSignature = (rawBody, signature) => {
    const secret = (0, env_1.getRequiredEnv)('razorpayWebhookSecret');
    const expectedSignature = crypto_1.default
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
    const provided = Buffer.from(signature, 'hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    if (provided.length !== expected.length)
        return false;
    return crypto_1.default.timingSafeEqual(expected, provided);
};
exports.verifyWebhookSignature = verifyWebhookSignature;
/**
 * Verify frontend-submitted payment signature (UX-only, NOT source of truth).
 */
const verifyPaymentSignature = (orderId, paymentId, signature) => {
    const secret = (0, env_1.getRequiredEnv)('razorpayKeySecret');
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto_1.default
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
    const provided = Buffer.from(signature, 'hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    if (provided.length !== expected.length)
        return false;
    return crypto_1.default.timingSafeEqual(expected, provided);
};
exports.verifyPaymentSignature = verifyPaymentSignature;
