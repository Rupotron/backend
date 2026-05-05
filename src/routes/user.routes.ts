import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateProfileSchema, createAddressSchema } from '../validators/user.validator';

const router = Router();

router.use(authMiddleware);

router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);

router.get('/address', userController.getAddresses);
router.post('/address', validate(createAddressSchema), userController.addAddress);

export default router;
