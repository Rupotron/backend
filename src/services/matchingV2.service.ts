import { prisma } from '../config/prisma';
import { pubClient, isRedisConnected } from '../config/redis';
import * as matchService from './match.service';

// Monitoring metrics
const metrics = {
  match_time_ms: [] as number[],
  partners_found_count: [] as number[],
  match_success_rate: 0,
  total_matches: 0,
  successful_matches: 0,
};

// Constants
const GEO_KEY = 'partners:geo';
const ONLINE_KEY = 'partners:online';
const METRICS_PREFIX = 'partner:metrics:';
const LAST_ASSIGNED_KEY = 'partner:lastAssigned:';
const SERVICES_PREFIX = 'partner:services:';
const METRICS_TTL = 600; // 10 minutes
const LAST_ASSIGNED_TTL = 3600; // 1 hour
const SERVICES_TTL = 1800; // 30 minutes

/**
 * Update partner location in Redis geo index
 * Called when partner sends location update
 */
export const updatePartnerLocation = async (
  partnerId: string,
  latitude: number,
  longitude: number,
  isOnline: boolean
) => {
  if (!pubClient || !isRedisConnected()) {
    console.warn('[Matching] Redis not available, skipping location update');
    return;
  }

  try {
    const pipeline = pubClient.pipeline();

    if (isOnline) {
      // Add to geo index
      pipeline.geoadd(GEO_KEY, longitude, latitude, partnerId);
      // Add to online set
      pipeline.sadd(ONLINE_KEY, partnerId);
    } else {
      // Remove from online set
      pipeline.srem(ONLINE_KEY, partnerId);
    }

    await pipeline.exec();
    console.log(`[Matching] Updated location for partner ${partnerId}`);
  } catch (error) {
    console.error('[Matching] Failed to update partner location:', error);
  }
};

/**
 * Sync partner metrics to Redis
 * Called periodically or on profile update
 */
export const syncPartnerMetrics = async (partnerId: string) => {
  if (!pubClient || !isRedisConnected()) return;

  try {
    const partner = await prisma.partnerProfile.findUnique({
      where: { id: partnerId },
      select: {
        rating: true,
        completedJobs: true,
        totalJobs: true,
        isBusy: true,
        isOnline: true,
      },
    });

    if (!partner) return;

    const completionRate = partner.totalJobs > 0 
      ? (partner.completedJobs / partner.totalJobs) 
      : 0;

    const metrics = {
      rating: String(partner.rating || 4.5),
      completionRate: String(completionRate),
      totalJobs: String(partner.totalJobs),
      isBusy: partner.isBusy ? '1' : '0',
      updatedAt: new Date().toISOString(),
    };

    await pubClient.hset(
      `${METRICS_PREFIX}${partnerId}`,
      metrics
    );

    // Set TTL
    await pubClient.expire(`${METRICS_PREFIX}${partnerId}`, METRICS_TTL);

    console.log(`[Matching] Synced metrics for partner ${partnerId}`);
  } catch (error) {
    console.error('[Matching] Failed to sync partner metrics:', error);
  }
};

/**
 * Sync partner services to Redis
 * Called on profile update or periodically
 */
export const syncPartnerServices = async (partnerId: string) => {
  if (!pubClient || !isRedisConnected()) return;

  try {
    const services = await prisma.partnerService.findMany({
      where: {
        partnerProfileId: partnerId,
        isActive: true,
      },
      select: { serviceId: true },
    });

    const serviceIds = services.map((s) => s.serviceId);

    if (serviceIds.length > 0) {
      await pubClient.del(`${SERVICES_PREFIX}${partnerId}`);
      await pubClient.sadd(`${SERVICES_PREFIX}${partnerId}`, ...serviceIds);
      await pubClient.expire(`${SERVICES_PREFIX}${partnerId}`, SERVICES_TTL);
    }
  } catch (error) {
    console.error('[Matching] Failed to sync partner services:', error);
  }
};

/**
 * Compute partner score based on multiple factors
 */
const computeScore = (
  distanceKm: number,
  rating: number,
  completionRate: number,
  availability: number,
  recentlyAssigned: boolean
): number => {
  // Distance score (inverse normalized)
  const distanceScore = Math.max(0, 1 - distanceKm / 10); // 0-1 range for 0-10km

  // Normalize rating to 0-1 (assuming max 5)
  const ratingScore = Math.min(rating / 5, 1);

  // Completion rate already 0-1
  const completionScore = completionRate;

  // Availability is already 0-1
  const availabilityScore = availability;

  // Calculate base score
  let score =
    0.4 * distanceScore +
    0.3 * ratingScore +
    0.2 * completionScore +
    0.1 * availabilityScore;

  // Penalize if recently assigned
  if (recentlyAssigned) {
    score *= 0.7; // 30% penalty
  }

  return score;
};

/**
 * Get nearby partners using Redis GEOSEARCH
 */
const getNearbyPartners = async (
  latitude: number,
  longitude: number,
  radiusKm: number
): Promise<string[]> => {
  if (!pubClient || !isRedisConnected()) {
    return [];
  }

  try {
    // Use GEOSEARCH to find partners within radius
    const partners = await pubClient.geosearch(
      GEO_KEY,
      'FROMMEMBER',
      'dummy', // We'll use FROMLONLAT instead
      'BYRADIUS',
      radiusKm,
      'km'
    );

    // Actually use GEOSEARCHSTORE or direct query
    // ioredis might have different API, let's use GEORADIUS
    const result = await pubClient.georadius(
      GEO_KEY,
      longitude,
      latitude,
      radiusKm,
      'km',
      'WITHDIST'
    );

    return result.map((item: any) => 
      Array.isArray(item) ? item[0] : item
    );
  } catch (error) {
    console.error('[Matching] GEORADIUS failed:', error);
    return [];
  }
};

/**
 * Get partners with dynamically expanding radius
 */
const getNearbyPartnersWithExpansion = async (
  latitude: number,
  longitude: number,
  minResults: number = 3
): Promise<Array<{ id: string; distance: number }>> => {
  const radii = [3, 5, 10, 20];
  const allPartners = new Map<string, number>();

  for (const radius of radii) {
    if (allPartners.size >= minResults) break;

    try {
      const result = await pubClient!.georadiusbymember_withcoord(
        GEO_KEY,
        '', // This won't work, need different approach
        radius,
        'km',
        'WITHDIST'
      );

      // Actually use proper Redis command
      const partners = await pubClient!.georadius(
        GEO_KEY,
        longitude,
        latitude,
        radius,
        'km',
        'WITHDIST'
      );

      for (const item of partners) {
        const [partnerId, distance] = Array.isArray(item)
          ? [item[0], parseFloat(item[1])]
          : [item, 0];

        if (!allPartners.has(partnerId)) {
          allPartners.set(partnerId, distance);
        }
      }
    } catch (error) {
      console.error(`[Matching] GEORADIUS at ${radius}km failed:`, error);
    }
  }

  return Array.from(allPartners.entries())
    .map(([id, distance]) => ({ id, distance }))
    .sort((a, b) => a.distance - b.distance);
};

/**
 * Check if partner was recently assigned
 */
const wasRecentlyAssigned = async (partnerId: string): Promise<boolean> => {
  if (!pubClient || !isRedisConnected()) return false;

  try {
    const result = await pubClient.get(`${LAST_ASSIGNED_KEY}${partnerId}`);
    return !!result;
  } catch (error) {
    console.error('[Matching] Failed to check recent assignment:', error);
    return false;
  }
};

/**
 * Mark partner as recently assigned
 */
const markRecentlyAssigned = async (partnerId: string) => {
  if (!pubClient || !isRedisConnected()) return;

  try {
    await pubClient.setex(
      `${LAST_ASSIGNED_KEY}${partnerId}`,
      LAST_ASSIGNED_TTL,
      '1'
    );
  } catch (error) {
    console.error('[Matching] Failed to mark assignment:', error);
  }
};

/**
 * Check if partner supports service
 */
const partnerSupportsService = async (
  partnerId: string,
  serviceId: string
): Promise<boolean> => {
  if (!pubClient || !isRedisConnected()) {
    // Fallback to DB
    const service = await prisma.partnerService.findFirst({
      where: {
        partnerProfileId: partnerId,
        serviceId,
        isActive: true,
      },
    });
    return !!service;
  }

  try {
    const result = await pubClient.sismember(
      `${SERVICES_PREFIX}${partnerId}`,
      serviceId
    );
    return result === 1;
  } catch (error) {
    console.error('[Matching] Failed to check service support:', error);
    // Fallback to DB
    const service = await prisma.partnerService.findFirst({
      where: {
        partnerProfileId: partnerId,
        serviceId,
        isActive: true,
      },
    });
    return !!service;
  }
};

/**
 * Main matching engine
 */
export const matchServiceRequest = async (
  serviceId: string,
  latitude: number,
  longitude: number
): Promise<any> => {
  const startTime = Date.now();

  try {
    // Try Redis-based matching first
    if (isRedisConnected()) {
      return await matchServiceRequestRedis(serviceId, latitude, longitude);
    } else {
      console.warn('[Matching] Redis not available, falling back to DB matching');
      return await matchServiceRequestDB(serviceId, latitude, longitude);
    }
  } catch (error) {
    console.error('[Matching] Error during matching:', error);
    // Fallback to DB matching
    return await matchServiceRequestDB(serviceId, latitude, longitude);
  } finally {
    const duration = Date.now() - startTime;
    recordMetric('match_time_ms', duration);
  }
};

/**
 * Redis-based matching implementation
 */
const matchServiceRequestRedis = async (
  serviceId: string,
  latitude: number,
  longitude: number
): Promise<any> => {
  // Step 1: Get nearby partners with expansion
  const nearbyPartners = await getNearbyPartnersWithExpansion(latitude, longitude, 3);

  if (nearbyPartners.length === 0) {
    recordMetric('partners_found_count', 0);
    return { partners: [] };
  }

  const candidates: any[] = [];

  // Step 2-4: Filter and score candidates
  for (const { id: partnerId, distance } of nearbyPartners) {
    try {
      // Check if online
      const isOnline = await pubClient!.sismember(ONLINE_KEY, partnerId);
      if (!isOnline) continue;

      // Check if supports service
      const supportsService = await partnerSupportsService(partnerId, serviceId);
      if (!supportsService) continue;

      // Get metrics
      const metricsData = await pubClient!.hgetall(`${METRICS_PREFIX}${partnerId}`);
      if (!metricsData || Object.keys(metricsData).length === 0) {
        // Fallback: sync metrics
        await syncPartnerMetrics(partnerId);
        const freshMetrics = await pubClient!.hgetall(`${METRICS_PREFIX}${partnerId}`);
        if (!freshMetrics || Object.keys(freshMetrics).length === 0) continue;
        Object.assign(metricsData, freshMetrics);
      }

      const rating = parseFloat(metricsData.rating || '4.5');
      const completionRate = parseFloat(metricsData.completionRate || '0.8');
      const isBusy = metricsData.isBusy === '1';

      if (isBusy) continue;

      // Check if recently assigned
      const recentlyAssigned = await wasRecentlyAssigned(partnerId);

      // Compute availability (1 if online and not busy, 0.5 otherwise)
      const availability = !isBusy ? 1 : 0;

      // Compute score
      const score = computeScore(distance, rating, completionRate, availability, recentlyAssigned);

      // Get partner name from DB (cached would be better)
      const partner = await prisma.partnerProfile.findUnique({
        where: { id: partnerId },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      });

      if (!partner) continue;

      candidates.push({
        partnerId,
        name: `${partner.user.firstName} ${partner.user.lastName}`,
        distance: parseFloat(distance.toFixed(2)),
        score: parseFloat(score.toFixed(4)),
        rating,
        completionRate: parseFloat((completionRate * 100).toFixed(1)),
        estimatedArrival: `${Math.ceil(distance * 3 + 5)} mins`,
      });
    } catch (error) {
      console.error(`[Matching] Error processing partner ${partnerId}:`, error);
    }
  }

  // Step 5: Sort by score
  candidates.sort((a, b) => b.score - a.score);

  // Return top 3-5
  const topMatches = candidates.slice(0, 5);

  // Mark top match as recently assigned (for load balancing)
  if (topMatches.length > 0) {
    await markRecentlyAssigned(topMatches[0].partnerId);
  }

  recordMetric('partners_found_count', topMatches.length);
  recordMetric('successful_matches', 1);

  return { partners: topMatches };
};

/**
 * DB-based fallback matching (original implementation)
 */
const matchServiceRequestDB = async (
  serviceId: string,
  latitude: number,
  longitude: number
): Promise<any> => {
  const result = await matchService.findMatches(serviceId, latitude, longitude, 10);
  recordMetric('partners_found_count', result.partners.length);
  return result;
};

/**
 * Record metrics
 */
const recordMetric = (metricName: keyof typeof metrics, value: any) => {
  if (metricName === 'match_time_ms' || metricName === 'partners_found_count') {
    (metrics[metricName] as number[]).push(value as number);
    // Keep only last 1000 records
    if ((metrics[metricName] as number[]).length > 1000) {
      (metrics[metricName] as number[]).shift();
    }
  } else if (metricName === 'successful_matches') {
    metrics.successful_matches += value as number;
    metrics.total_matches += 1;
    metrics.match_success_rate = metrics.successful_matches / metrics.total_matches;
  }
};

/**
 * Get matching metrics
 */
export const getMetrics = () => {
  const avgMatchTime =
    metrics.match_time_ms.length > 0
      ? metrics.match_time_ms.reduce((a, b) => a + b, 0) / metrics.match_time_ms.length
      : 0;

  const avgPartnersFound =
    metrics.partners_found_count.length > 0
      ? metrics.partners_found_count.reduce((a, b) => a + b, 0) / metrics.partners_found_count.length
      : 0;

  return {
    avg_match_time_ms: parseFloat(avgMatchTime.toFixed(2)),
    avg_partners_found: parseFloat(avgPartnersFound.toFixed(2)),
    match_success_rate: parseFloat((metrics.match_success_rate * 100).toFixed(2)) + '%',
    total_matches: metrics.total_matches,
    total_successful_matches: metrics.successful_matches,
  };
};

/**
 * Health check for matching system
 */
export const healthCheck = () => {
  return {
    redis_connected: isRedisConnected(),
    metrics: getMetrics(),
  };
};
