import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt.util';

// ─── In-memory OTP store (MVP) ────────────────────────────────────────────────
// Replace with Redis in production
const otpStore = new Map<string, { otp: string; expiresAt: Date }>();

const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit

export const sendOtp = async (phone: string) => {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min TTL
  otpStore.set(phone, { otp, expiresAt });

  // In production: send via Twilio/MSG91
  console.log(`[OTP] ${phone} → ${otp} (expires ${expiresAt.toISOString()})`);

  return { message: 'OTP sent successfully', ...(process.env.NODE_ENV !== 'production' && { otp }) };
};

export const verifyOtp = async (phone: string, otp: string) => {
  const stored = otpStore.get(phone);

  if (!stored) throw { statusCode: 400, message: 'No OTP found for this number. Request a new one.' };
  if (new Date() > stored.expiresAt) {
    otpStore.delete(phone);
    throw { statusCode: 400, message: 'OTP has expired. Please request a new one.' };
  }
  if (stored.otp !== otp) throw { statusCode: 400, message: 'Invalid OTP' };

  otpStore.delete(phone); // consume

  // Find or create user by phone
  let user = await prisma.user.findFirst({ where: { phone } });

  if (!user) {
    // Auto-register on first login
    user = await prisma.user.create({
      data: {
        phone,
        email: `${phone}@otp.shomeus.com`, // synthetic email for schema compat
        passwordHash: await bcrypt.hash(Math.random().toString(36), 4), // unused dummy
        firstName: 'User',
        lastName: phone.slice(-4),
        role: 'USER'
      }
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
      role: user.role
    }
  };
};

// ─── Keep email/password auth for admin/partner logins ────────────────────────
export const registerUser = async (data: any) => {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) throw { statusCode: 400, message: 'User with this email already exists' };

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: { email: data.email, passwordHash, firstName: data.firstName, lastName: data.lastName, phone: data.phone }
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
