import { Router } from 'express';
import * as partnerController from '../controllers/partner.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createPartnerProfileSchema, addServiceSchema, toggleStatusSchema } from '../validators/partner.validator';

const router = Router();

router.use(authMiddleware);

router.post('/create-profile', validate(createPartnerProfileSchema), partnerController.createProfile);
router.get('/profile', partnerController.getProfile);
router.post('/add-service', validate(addServiceSchema), partnerController.addService);
router.put('/toggle-status', validate(toggleStatusSchema), partnerController.toggleStatus);

export default router;
