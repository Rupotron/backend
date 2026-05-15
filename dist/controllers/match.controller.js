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
exports.getMatchingMetrics = exports.syncPartnerMetrics = exports.updatePartnerLocation = exports.matchPartnersV2 = exports.matchPartners = void 0;
const matchService = __importStar(require("../services/match.service"));
const matchingV2Service = __importStar(require("../services/matchingV2.service"));
const redis_1 = require("../config/redis");
const matchPartners = async (req, res) => {
    const { serviceId, latitude, longitude, radius } = req.body;
    console.log(`[Matching Engine] Searching for service ${serviceId} near lat:${latitude}, lon:${longitude}`);
    const result = await matchService.findMatches(serviceId, latitude, longitude, radius || 10);
    res.status(200).json(result);
};
exports.matchPartners = matchPartners;
/**
 * New Redis-based matching endpoint (V2)
 */
const matchPartnersV2 = async (req, res) => {
    const { serviceId, latitude, longitude } = req.body;
    if (!serviceId || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            message: 'Missing required fields: serviceId, latitude, longitude',
        });
    }
    console.log(`[Matching Engine V2] Searching for service ${serviceId} near lat:${latitude}, lon:${longitude}`);
    try {
        const result = await matchingV2Service.matchServiceRequest(serviceId, latitude, longitude);
        res.status(200).json({
            success: true,
            redisEnabled: (0, redis_1.isRedisConnected)(),
            ...result,
        });
    }
    catch (error) {
        console.error('[Matching Engine V2] Error:', error);
        res.status(500).json({
            message: 'Matching failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.matchPartnersV2 = matchPartnersV2;
/**
 * Update partner location in Redis
 */
const updatePartnerLocation = async (req, res) => {
    const { partnerId, latitude, longitude, isOnline } = req.body;
    if (!partnerId || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            message: 'Missing required fields: partnerId, latitude, longitude',
        });
    }
    try {
        await matchingV2Service.updatePartnerLocation(partnerId, latitude, longitude, isOnline !== false);
        res.status(200).json({
            success: true,
            message: 'Partner location updated',
        });
    }
    catch (error) {
        console.error('[Matching] Location update error:', error);
        res.status(500).json({
            message: 'Failed to update location',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.updatePartnerLocation = updatePartnerLocation;
/**
 * Sync partner metrics to Redis
 */
const syncPartnerMetrics = async (req, res) => {
    const { partnerId } = req.body;
    if (!partnerId) {
        return res.status(400).json({
            message: 'Missing required field: partnerId',
        });
    }
    try {
        await matchingV2Service.syncPartnerMetrics(partnerId);
        res.status(200).json({
            success: true,
            message: 'Partner metrics synced',
        });
    }
    catch (error) {
        console.error('[Matching] Metrics sync error:', error);
        res.status(500).json({
            message: 'Failed to sync metrics',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.syncPartnerMetrics = syncPartnerMetrics;
/**
 * Get matching system metrics
 */
const getMatchingMetrics = async (req, res) => {
    try {
        const metrics = matchingV2Service.getMetrics();
        const health = matchingV2Service.healthCheck();
        res.status(200).json({
            success: true,
            metrics,
            health,
        });
    }
    catch (error) {
        console.error('[Matching] Metrics retrieval error:', error);
        res.status(500).json({
            message: 'Failed to retrieve metrics',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.getMatchingMetrics = getMatchingMetrics;
