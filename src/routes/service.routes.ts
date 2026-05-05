import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';

const router = Router();

router.get('/categories', serviceController.getCategories);
router.get('/:categoryId', serviceController.getServicesByCategory);
router.get('/details/:serviceId', serviceController.getServiceDetails);

export default router;
