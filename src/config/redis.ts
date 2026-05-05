import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL;

export const redisEnabled = Boolean(redisUrl);
export const pubClient = redisUrl ? new Redis(redisUrl, { lazyConnect: true }) : null;
export const subClient = pubClient ? pubClient.duplicate() : null;

let redisConnected = false;

const attachLogging = (client: Redis | null, name: string) => {
  if (!client) return;

  client.on('connect', () => {
    console.log(`[Redis] ${name} connected`);
  });
  client.on('ready', () => {
    redisConnected = true;
    console.log(`[Redis] ${name} ready`);
  });
  client.on('error', (error) => {
    redisConnected = false;
    console.error(`[Redis] ${name} error`, error);
  });
  client.on('end', () => {
    redisConnected = false;
    console.error(`[Redis] ${name} disconnected`);
  });
};

attachLogging(pubClient, 'pub');
attachLogging(subClient, 'sub');

export const connectRedis = async () => {
  if (!pubClient || !subClient) {
    console.warn('[Redis] REDIS_URL is not set. Socket.IO and Geo Matching are running without Redis.');
    return false;
  }

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    return true;
  } catch (error) {
    redisConnected = false;
    console.error('[Redis] Critical: failed to connect. Cross-instance socket events and geo-matching are disabled.', error);
    return false;
  }
};

export const isRedisConnected = () => redisConnected;

export const markPartnerOnline = async (partnerId: string) => {
  if (!pubClient || !redisConnected) return;
  await pubClient.sadd('partners:online', partnerId);
};

export const markPartnerOffline = async (partnerId: string) => {
  if (!pubClient || !redisConnected) return;
  await pubClient.srem('partners:online', partnerId);
};

export const storePartnerLocation = async (partnerId: string, lat: number, lng: number) => {
  if (!pubClient || !redisConnected) return;

  await pubClient
    .multi()
    .hset(`partner_location:${partnerId}`, {
      lat: String(lat),
      lng: String(lng),
      updatedAt: new Date().toISOString(),
    })
    .geoadd('partners:geo', lng, lat, partnerId)
    .exec();
};

/**
 * Get Redis client for custom operations
 */
export const getRedisClient = () => pubClient;

/**
 * Flush Redis cache (for testing/maintenance)
 */
export const flushRedis = async () => {
  if (!pubClient || !redisConnected) return false;
  try {
    await pubClient.flushdb();
    console.log('[Redis] Database flushed');
    return true;
  } catch (error) {
    console.error('[Redis] Failed to flush database:', error);
    return false;
  }
};
