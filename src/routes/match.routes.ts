import { Router } from 'express';
import * as matchController from '../controllers/match.controller';
import { validate } from '../middlewares/validate.middleware';
import { authMiddleware, authorizeRole } from '../middlewares/auth.middleware';
import { matchServiceSchema, partnerLocationSchema, syncPartnerMetricsSchema } from '../validators/match.validator';

const router = Router();

router.use(authMiddleware);

// Original matching endpoint
// POST /api/v1/match
router.post('/', validate(matchServiceSchema), matchController.matchPartners);

// V2 Redis-based matching endpoint
// POST /api/v1/match/v2
router.post('/v2', validate(matchServiceSchema), matchController.matchPartnersV2);

// Update partner location (called by partner app)
// POST /api/v1/match/location
router.post('/location', authorizeRole(['PARTNER']), validate(partnerLocationSchema), matchController.updatePartnerLocation);

// Sync partner metrics to Redis
// POST /api/v1/match/sync-metrics
router.post('/sync-metrics', authorizeRole(['ADMIN']), validate(syncPartnerMetricsSchema), matchController.syncPartnerMetrics);

// GET /api/v1/match/metrics
router.get('/metrics', authorizeRole(['ADMIN']), matchController.getMatchingMetrics);

export default router;
