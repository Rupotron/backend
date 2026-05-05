import { Router } from 'express';
import { Role } from '@prisma/client';
import * as adminController from '../controllers/admin.controller';
import { authMiddleware, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware, authorizeRole([Role.ADMIN]));

router.get('/dashboard', adminController.dashboard);
router.get('/users', adminController.users);
router.patch('/users/:id/disable', adminController.disableUser);

router.get('/partners', adminController.partners);
router.get('/partners/:id', adminController.partner);
router.patch('/partners/:id/action', adminController.partnerAction);

router.get('/bookings', adminController.bookings);
router.get('/bookings/:id', adminController.booking);
router.patch('/bookings/:id/cancel', adminController.cancelBooking);

router.get('/payments', adminController.payments);
router.patch('/payments/:id/action', adminController.paymentAction);

export default router;
