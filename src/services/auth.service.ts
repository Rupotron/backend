import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateToken } from '../utils/jwt.util';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// Replace with Redis or an SMS provider verification API before scaling horizontally.
const otpStore = new Map<string, { otp: string; expiresAt: Date; attempts: number }>();

const generateOtp = () => crypto.randomInt(1000, 10000).toString();

export const sendOtp = async (phone: string) => {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  otpStore.set(phone, { otp, expiresAt, attempts: 0 });

  if (process.env.NODE_ENV === 'production') {
    console.info(`[OTP] Generated for ${phone} (expires ${expiresAt.toISOString()})`);
  } else {
    console.info(`[OTP] ${phone} -> ${otp} (expires ${expiresAt.toISOString()})`);
  }

  return { message: 'OTP sent successfully', ...(process.env.NODE_ENV !== 'production' && { otp }) };
};

export const verifyOtp = async (phone: string, otp: string) => {
  const stored = otpStore.get(phone);

  if (!stored) throw { statusCode: 400, message: 'No OTP found for this number. Request a new one.' };
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

  let user = await prisma.user.findFirst({ where: { phone } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        email: `${phone}@otp.shomeus.com`,
        passwordHash: await bcrypt.hash(crypto.randomUUID(), 10),
        firstName: 'User',
        lastName: phone.slice(-4),
        role: 'USER',
      },
    });
  }

  const token = generateToken({ userId: user.id, role: user.role });

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

export const registerUser = async (data: any) => {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) throw { statusCode: 400, message: 'User with this email already exists' };

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { email: data.email, passwordHash, firstName: data.firstName, lastName: data.lastName, phone: data.phone },
  });

  const token = generateToken({ userId: user.id, role: user.role });
  return { token, user: { userId: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } };
};

export const loginUser = async (data: any) => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || user.isDeleted) throw { statusCode: 401, message: 'Invalid credentials' };

  const isMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!isMatch) throw { statusCode: 401, message: 'Invalid credentials' };

  const token = generateToken({ userId: user.id, role: user.role });
  return { token, user: { userId: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } };
};
