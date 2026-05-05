import { Request, Response } from 'express';
import * as matchService from '../services/match.service';
import * as matchingV2Service from '../services/matchingV2.service';
import { isRedisConnected } from '../config/redis';

export const matchPartners = async (req: Request, res: Response) => {
  const { serviceId, latitude, longitude, radius } = req.body;
  
  console.log(`[Matching Engine] Searching for service ${serviceId} near lat:${latitude}, lon:${longitude}`);
  
  const result = await matchService.findMatches(serviceId, latitude, longitude, radius || 10);
  
  res.status(200).json(result);
};

/**
 * New Redis-based matching endpoint (V2)
 */
export const matchPartnersV2 = async (req: Request, res: Response) => {
  const { serviceId, latitude, longitude } = req.body;

  if (!serviceId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      message: 'Missing required fields: serviceId, latitude, longitude',
    });
  }

  console.log(
    `[Matching Engine V2] Searching for service ${serviceId} near lat:${latitude}, lon:${longitude}`
  );

  try {
    const result = await matchingV2Service.matchServiceRequest(
      serviceId,
      latitude,
      longitude
    );

    res.status(200).json({
      success: true,
      redisEnabled: isRedisConnected(),
      ...result,
    });
  } catch (error) {
    console.error('[Matching Engine V2] Error:', error);
    res.status(500).json({
      message: 'Matching failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Update partner location in Redis
 */
export const updatePartnerLocation = async (req: Request, res: Response) => {
  const { partnerId, latitude, longitude, isOnline } = req.body;

  if (!partnerId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      message: 'Missing required fields: partnerId, latitude, longitude',
    });
  }

  try {
    await matchingV2Service.updatePartnerLocation(
      partnerId,
      latitude,
      longitude,
      isOnline !== false
    );

    res.status(200).json({
      success: true,
      message: 'Partner location updated',
    });
  } catch (error) {
    console.error('[Matching] Location update error:', error);
    res.status(500).json({
      message: 'Failed to update location',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Sync partner metrics to Redis
 */
export const syncPartnerMetrics = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('[Matching] Metrics sync error:', error);
    res.status(500).json({
      message: 'Failed to sync metrics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get matching system metrics
 */
export const getMatchingMetrics = async (req: Request, res: Response) => {
  try {
    const metrics = matchingV2Service.getMetrics();
    const health = matchingV2Service.healthCheck();

    res.status(200).json({
      success: true,
      metrics,
      health,
    });
  } catch (error) {
    console.error('[Matching] Metrics retrieval error:', error);
    res.status(500).json({
      message: 'Failed to retrieve metrics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
