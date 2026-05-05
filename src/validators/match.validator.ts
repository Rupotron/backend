import { z } from 'zod';

export const matchServiceSchema = z.object({
  serviceId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().positive().default(10)
});
