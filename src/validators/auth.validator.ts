import { z } from 'zod';

const phoneSchema = z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Enter a valid phone number');

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  phone: phoneSchema.optional()
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1)
});

export const sendOtpSchema = z.object({
  phone: phoneSchema
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().regex(/^\d{4}$/, 'OTP must be a 4-digit code')
});
