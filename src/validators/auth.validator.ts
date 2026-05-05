import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15)
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(4)
});
