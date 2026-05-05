"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtpSchema = exports.sendOtpSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    firstName: zod_1.z.string().min(2),
    lastName: zod_1.z.string().min(2),
    phone: zod_1.z.string().optional()
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string()
});
exports.sendOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().min(10).max(15)
});
exports.verifyOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().min(10).max(15),
    otp: zod_1.z.string().length(4)
});
