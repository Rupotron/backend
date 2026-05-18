"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = exports.verifyOtp = exports.sendOtp = void 0;
const prisma_1 = require("../config/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const jwt_util_1 = require("../utils/jwt.util");
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
// Replace with Redis or an SMS provider verification API before scaling horizontally.
const otpStore = new Map();
const generateOtp = () => crypto_1.default.randomInt(1000, 10000).toString();
const sendOtp = async (phone) => {
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    otpStore.set(phone, { otp, expiresAt, attempts: 0 });
    if (process.env.NODE_ENV === 'production') {
        console.info(`[OTP] Generated for ${phone} (expires ${expiresAt.toISOString()})`);
    }
    else {
        console.info(`[OTP] ${phone} -> ${otp} (expires ${expiresAt.toISOString()})`);
    }
    return { message: 'OTP sent successfully', ...(process.env.NODE_ENV !== 'production' && { otp }) };
};
exports.sendOtp = sendOtp;
const verifyOtp = async (phone, otp) => {
    const stored = otpStore.get(phone);
    if (!stored)
        throw { statusCode: 400, message: 'No OTP found for this number. Request a new one.' };
    if (new Date() > stored.expiresAt) {
        otpStore.delete(phone);
        throw { statusCode: 400, message: 'OTP has expired. Please request a new one.' };
    }
    if (stored.otp !== otp) {
        stored.attempts += 1;
        if (stored.attempts >= MAX_OTP_ATTEMPTS) {
            otpStore.delete(phone);
            throw { statusCode: 429, message: 'Too many invalid OTP attempts. Request a new code.' };
        }
        throw { statusCode: 400, message: 'Invalid OTP' };
    }
    otpStore.delete(phone);
    let user = await prisma_1.prisma.user.findFirst({ where: { phone } });
    if (!user) {
        user = await prisma_1.prisma.user.create({
            data: {
                phone,
                email: `${phone}@otp.shomeus.com`,
                passwordHash: await bcryptjs_1.default.hash(crypto_1.default.randomUUID(), 10),
                firstName: 'User',
                lastName: phone.slice(-4),
                role: 'USER',
            },
        });
    }
    const token = (0, jwt_util_1.generateToken)({ userId: user.id, role: user.role });
    return {
        token,
        user: {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
        },
    };
};
exports.verifyOtp = verifyOtp;
const registerUser = async (data) => {
    const existingUser = await prisma_1.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser)
        throw { statusCode: 400, message: 'User with this email already exists' };
    const passwordHash = await bcryptjs_1.default.hash(data.password, 10);
    const user = await prisma_1.prisma.user.create({
        data: { email: data.email, passwordHash, firstName: data.firstName, lastName: data.lastName, phone: data.phone },
    });
    const token = (0, jwt_util_1.generateToken)({ userId: user.id, role: user.role });
    return { token, user: { userId: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } };
};
exports.registerUser = registerUser;
const loginUser = async (data) => {
    const user = await prisma_1.prisma.user.findUnique({ where: { email: data.email } });
    if (!user || user.isDeleted)
        throw { statusCode: 401, message: 'Invalid credentials' };
    const isMatch = await bcryptjs_1.default.compare(data.password, user.passwordHash);
    if (!isMatch)
        throw { statusCode: 401, message: 'Invalid credentials' };
    const token = (0, jwt_util_1.generateToken)({ userId: user.id, role: user.role });
    return { token, user: { userId: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } };
};
exports.loginUser = loginUser;
