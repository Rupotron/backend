import { z } from 'zod';

export const matchServiceSchema = z.object({
  serviceId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().positive().default(10)
});

export const partnerLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isOnline: z.boolean().optional()
});

export const syncPartnerMetricsSchema = z.object({
  partnerId: z.string().uuid()
});
