import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller';
import { validate } from '../middlewares/validate.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { createBookingSchema, updateStatusSchema } from '../validators/booking.validator';

const router = Router();
router.use(authMiddleware);

// User routes
router.post('/', validate(createBookingSchema), bookingController.createBooking);
router.patch('/:id/status', validate(updateStatusSchema), bookingController.updateStatus);
router.patch('/:id/cancel', bookingController.cancelBooking);
router.get('/', bookingController.getHistory);

// Partner job actions
router.post('/:id/accept', bookingController.acceptJob);
router.post('/:id/reject', bookingController.rejectJob);
router.patch('/:id/start', bookingController.startJob);
router.patch('/:id/complete', bookingController.completeJob);
router.get('/partner/jobs', bookingController.getPartnerJobs);

// Single booking (must come after /partner/jobs to avoid route conflict)
router.get('/:id', bookingController.getBookingById);

export default router;
