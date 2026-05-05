import { Router } from 'express';
import * as matchController from '../controllers/match.controller';
import { validate } from '../middlewares/validate.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { matchServiceSchema } from '../validators/match.validator';

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
router.post('/location', matchController.updatePartnerLocation);

// Sync partner metrics to Redis
// POST /api/v1/match/sync-metrics
router.post('/sync-metrics', matchController.syncPartnerMetrics);

// Get matching system metrics (admin only, no auth check for now)
// GET /api/v1/match/metrics
router.get('/metrics', matchController.getMatchingMetrics);

export default router;
