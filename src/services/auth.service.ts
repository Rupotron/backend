import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import { generateToken } from '../utils/jwt.util';
import { env } from '../config/env';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// Replace with Redis or an SMS provider verification API before scaling horizontally.
const otpStore = new Map<string, { otp: string; expiresAt: Date; attempts: number }>();

const generateOtp = () => crypto.randomInt(1000, 10000).toString();

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
  sub?: string;
  error?: string;
  error_description?: string;
};

const buildAuthResponse = (user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: Role;
}) => {
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

  return buildAuthResponse(user);
};

export const registerUser = async (data: any) => {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) throw { statusCode: 400, message: 'User with this email already exists' };

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { email: data.email, passwordHash, firstName: data.firstName, lastName: data.lastName, phone: data.phone },
  });

  return buildAuthResponse(user);
};

export const loginUser = async (data: any) => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || user.isDeleted) throw { statusCode: 401, message: 'Invalid credentials' };

  const isMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!isMatch) throw { statusCode: 401, message: 'Invalid credentials' };

  return buildAuthResponse(user);
};

export const loginWithGoogle = async (idToken: string) => {
  if (!env.googleClientId) {
    throw { statusCode: 503, message: 'Google sign-in is not configured yet' };
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );

  if (!response.ok) {
    throw { statusCode: 401, message: 'Invalid Google sign-in token' };
  }

  const profile = (await response.json()) as GoogleTokenInfo;

  if (profile.error) {
    throw { statusCode: 401, message: profile.error_description ?? 'Invalid Google sign-in token' };
  }

  if (profile.aud !== env.googleClientId) {
    throw { statusCode: 401, message: 'Google sign-in token was issued for a different app' };
  }

  if (!profile.email || profile.email_verified !== true && profile.email_verified !== 'true') {
    throw { statusCode: 401, message: 'Google account email is not verified' };
  }

  const email = profile.email.toLowerCase();
  const firstName = profile.given_name || profile.name?.split(' ')[0] || 'Shom';
  const lastName = profile.family_name || profile.name?.split(' ').slice(1).join(' ') || 'User';

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser?.isDeleted) {
    throw { statusCode: 403, message: 'This account is not active' };
  }

  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(`google:${profile.sub ?? crypto.randomUUID()}:${crypto.randomUUID()}`, 10),
        firstName,
        lastName,
        role: 'USER',
      },
    }));

  return buildAuthResponse(user);
};
