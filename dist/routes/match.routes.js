"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const matchController = __importStar(require("../controllers/match.controller"));
const validate_middleware_1 = require("../middlewares/validate.middleware");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const match_validator_1 = require("../validators/match.validator");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
// Original matching endpoint
// POST /api/v1/match
router.post('/', (0, validate_middleware_1.validate)(match_validator_1.matchServiceSchema), matchController.matchPartners);
// V2 Redis-based matching endpoint
// POST /api/v1/match/v2
router.post('/v2', (0, validate_middleware_1.validate)(match_validator_1.matchServiceSchema), matchController.matchPartnersV2);
// Update partner location (called by partner app)
// POST /api/v1/match/location
router.post('/location', matchController.updatePartnerLocation);
// Sync partner metrics to Redis
// POST /api/v1/match/sync-metrics
router.post('/sync-metrics', matchController.syncPartnerMetrics);
// Get matching system metrics (admin only, no auth check for now)
// GET /api/v1/match/metrics
router.get('/metrics', matchController.getMatchingMetrics);
exports.default = router;
