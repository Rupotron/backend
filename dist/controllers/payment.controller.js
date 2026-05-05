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
exports.handleWebhook = exports.verifyPayment = exports.createOrder = void 0;
const paymentService = __importStar(require("../services/payment.service"));
const razorpayService = __importStar(require("../services/razorpay.service"));
const socket_1 = require("../config/socket");
const createOrder = async (req, res) => {
    const { bookingId } = req.body;
    const result = await paymentService.createPaymentOrder(req.user.userId, bookingId);
    res.status(201).json(result);
};
exports.createOrder = createOrder;
const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const result = await paymentService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    (0, socket_1.emitAdminPaymentUpdated)(result);
    res.status(200).json(result);
};
exports.verifyPayment = verifyPayment;
/**
 * Webhook — must receive raw body for HMAC to work correctly.
 * Express.raw() is mounted only on this route.
 */
const handleWebhook = async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
        console.warn('[Webhook] Missing X-Razorpay-Signature header');
        res.status(400).json({ message: 'Missing signature' });
        return;
    }
    const rawBody = req.body;
    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
        console.error('[Webhook] HMAC signature mismatch — possible spoofing attempt');
        res.status(400).json({ message: 'Invalid webhook signature' });
        return;
    }
    const payload = JSON.parse(rawBody.toString());
    const event = payload.event;
    // Acknowledge Razorpay IMMEDIATELY — then process async
    res.status(200).json({ received: true });
    await paymentService.handleWebhookEvent(event, payload);
};
exports.handleWebhook = handleWebhook;
