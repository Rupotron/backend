"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtpSchema = exports.sendOtpSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const phoneSchema = zod_1.z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Enter a valid phone number');
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email(),
    password: zod_1.z.string().min(8),
    firstName: zod_1.z.string().trim().min(2),
    lastName: zod_1.z.string().trim().min(2),
    phone: phoneSchema.optional()
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email(),
    password: zod_1.z.string().min(1)
});
exports.sendOtpSchema = zod_1.z.object({
    phone: phoneSchema
});
exports.verifyOtpSchema = zod_1.z.object({
    phone: phoneSchema,
    otp: zod_1.z.string().regex(/^\d{4}$/, 'OTP must be a 4-digit code')
});
