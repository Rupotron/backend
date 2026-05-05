import { getRedisClient, isRedisConnected } from '../config/redis';

/**
 * Redis Geo Matching Utilities
 * Provides helper functions for Redis geo operations
 */

/**
 * Clear all geo matching data from Redis
 */
export const clearGeoData = async () => {
  const client = getRedisClient();
  if (!client || !isRedisConnected()) {
    console.warn('[RedisGeo] Redis not available');
    return false;
  }

  try {
    const keys = [
      'partners:geo',
      'partners:online',
      'partner:metrics:*',
      'partner:services:*',
      'partner:lastAssigned:*',
      'partner_location:*',
    ];

    for (const pattern of keys) {
      const matchedKeys = await client.keys(pattern);
      if (matchedKeys.length > 0) {
        await client.del(...matchedKeys);
      }
    }

    console.log('[RedisGeo] Cleared all geo data');
    return true;
  } catch (error) {
    console.error('[RedisGeo] Failed to clear data:', error);
    return false;
  }
};

/**
 * Initialize geo index by loading all active partners
 */
export const initializeGeoIndex = async () => {
  const client = getRedisClient();
  if (!client || !isRedisConnected()) {
    console.warn('[RedisGeo] Redis not available');
    return false;
  }

  try {
    // Import here to avoid circular dependency
    const { prisma } = await import('../config/prisma');

    const partners = await prisma.partnerProfile.findMany({
      where: {
        isDeleted: false,
        location: {
          isNot: null,
        },
      },
      include: {
        location: true,
        partnerServices: {
          where: { isActive: true },
          select: { serviceId: true },
        },
      },
    });

    let addedCount = 0;

    for (const partner of partners) {
      if (!partner.location) continue;

      const pipeline = client.pipeline();

      // Add to geo index
      pipeline.geoadd(
        'partners:geo',
        partner.location.longitude,
        partner.location.latitude,
        partner.id
      );

      // Add to online set if online
      if (partner.isOnline) {
        pipeline.sadd('partners:online', partner.id);
      }

      // Set metrics
      const completionRate = partner.totalJobs > 0
        ? (partner.completedJobs / partner.totalJobs)
        : 0;

      pipeline.hset(`partner:metrics:${partner.id}`, {
        rating: String(partner.rating || 4.5),
        completionRate: String(completionRate),
        totalJobs: String(partner.totalJobs),
        isBusy: partner.isBusy ? '1' : '0',
        updatedAt: new Date().toISOString(),
      });

      // Set services
      const serviceIds = partner.partnerServices.map((s) => s.serviceId);
      if (serviceIds.length > 0) {
        pipeline.sadd(`partner:services:${partner.id}`, ...serviceIds);
      }

      await pipeline.exec();
      addedCount++;
    }

    console.log(`[RedisGeo] Initialized geo index with ${addedCount} partners`);
    return true;
  } catch (error) {
    console.error('[RedisGeo] Failed to initialize geo index:', error);
    return false;
  }
};

/**
 * Get all partners in Redis
 */
export const getAllPartnersInRedis = async () => {
  const client = getRedisClient();
  if (!client || !isRedisConnected()) return [];

  try {
    const partnerKeys = await client.keys('partner:metrics:*');
    return partnerKeys.map((key) => key.replace('partner:metrics:', ''));
  } catch (error) {
    console.error('[RedisGeo] Failed to get partners:', error);
    return [];
  }
};

/**
 * Get online partners count
 */
export const getOnlinePartnersCount = async () => {
  const client = getRedisClient();
  if (!client || !isRedisConnected()) return 0;

  try {
    return await client.scard('partners:online');
  } catch (error) {
    console.error('[RedisGeo] Failed to get online count:', error);
    return 0;
  }
};

/**
 * Get partner info from Redis
 */
export const getPartnerInfoFromRedis = async (partnerId: string) => {
  const client = getRedisClient();
  if (!client || !isRedisConnected()) return null;

  try {
    const metrics = await client.hgetall(`partner:metrics:${partnerId}`);
    const isOnline = await client.sismember('partners:online', partnerId);
    const services = await client.smembers(`partner:services:${partnerId}`);

    if (Object.keys(metrics).length === 0) return null;

    return {
      partnerId,
      ...metrics,
      isOnline: isOnline === 1,
      services,
    };
  } catch (error) {
    console.error('[RedisGeo] Failed to get partner info:', error);
    return null;
  }
};

/**
 * Update partner online status
 */
export const updatePartnerOnlineStatus = async (
  partnerId: string,
  isOnline: boolean
) => {
  const client = getRedisClient();
  if (!client || !isRedisConnected()) return false;

  try {
    if (isOnline) {
      await client.sadd('partners:online', partnerId);
    } else {
      await client.srem('partners:online', partnerId);
    }
    return true;
  } catch (error) {
    console.error('[RedisGeo] Failed to update online status:', error);
    return false;
  }
};

/**
 * Batch update partner metrics
 */
export const batchUpdateMetrics = async (updates: Array<{ partnerId: string; metrics: Record<string, string> }>) => {
  const client = getRedisClient();
  if (!client || !isRedisConnected()) return false;

  try {
    const pipeline = client.pipeline();

    for (const { partnerId, metrics } of updates) {
      pipeline.hset(`partner:metrics:${partnerId}`, metrics);
      pipeline.expire(`partner:metrics:${partnerId}`, 600); // 10 min TTL
    }

    await pipeline.exec();
    return true;
  } catch (error) {
    console.error('[RedisGeo] Failed to batch update metrics:', error);
    return false;
  }
};

/**
 * Get stats for monitoring
 */
export const getGeoStats = async () => {
  const client = getRedisClient();
  if (!client || !isRedisConnected()) return null;

  try {
    const onlineCount = await client.scard('partners:online');
    const totalInGeo = await client.zcard('partners:geo');
    const metricsKeys = await client.keys('partner:metrics:*');
    const servicesKeys = await client.keys('partner:services:*');

    return {
      onlinePartnersCount: onlineCount,
      totalPartnersInGeo: totalInGeo,
      metricsStoredCount: metricsKeys.length,
      servicesStoredCount: servicesKeys.length,
      redisMemoryUsage: await client.info('memory'),
    };
  } catch (error) {
    console.error('[RedisGeo] Failed to get stats:', error);
    return null;
  }
};
