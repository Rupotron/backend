"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaymentSchema = exports.createOrderSchema = void 0;
const zod_1 = require("zod");
exports.createOrderSchema = zod_1.z.object({
    bookingId: zod_1.z.string().uuid()
});
exports.verifyPaymentSchema = zod_1.z.object({
    razorpay_order_id: zod_1.z.string(),
    razorpay_payment_id: zod_1.z.string(),
    razorpay_signature: zod_1.z.string()
});
