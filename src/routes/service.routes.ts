import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';

const router = Router();

router.get('/', serviceController.getServices);
router.get('/categories', serviceController.getCategories);
router.get('/details/:serviceId', serviceController.getServiceDetails);
router.get('/:categoryId', serviceController.getServicesByCategory);

export default router;
