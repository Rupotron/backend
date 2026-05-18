import { z } from 'zod';

export const createBookingSchema = z.object({
  partnerProfileId: z.string().uuid(),
  serviceId: z.string().uuid(),
  addressId: z.string().uuid(),
  scheduledDate: z.string().datetime().refine((value) => new Date(value).getTime() > Date.now(), {
    message: 'scheduledDate must be in the future'
  })
});

export const updateStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  cancelReason: z.string().trim().max(500).optional()
});
