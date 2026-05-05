import { z } from 'zod';

export const createPartnerProfileSchema = z.object({
  bio: z.string().optional()
});

export const addServiceSchema = z.object({
  serviceId: z.string().uuid(),
  customPrice: z.number().positive().optional()
});

export const toggleStatusSchema = z.object({
  isOnline: z.boolean().optional(),
  isBusy: z.boolean().optional()
});
