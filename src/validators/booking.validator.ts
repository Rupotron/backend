import { z } from 'zod';

export const createBookingSchema = z.object({
  partnerProfileId: z.string().uuid(),
  serviceId: z.string().uuid(),
  addressId: z.string().uuid(),
  scheduledDate: z.string().datetime()
});

export const updateStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  cancelReason: z.string().optional()
});
