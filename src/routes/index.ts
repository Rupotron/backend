import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import serviceRoutes from './service.routes';
import partnerRoutes from './partner.routes';
import matchRoutes from './match.routes';
import bookingRoutes from './booking.routes';
import paymentRoutes from './payment.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/services', serviceRoutes);
router.use('/partner', partnerRoutes);
router.use('/match-service', matchRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payment', paymentRoutes);
router.use('/admin', adminRoutes);

export default router;
