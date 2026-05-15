"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flushRedis = exports.getRedisClient = exports.storePartnerLocation = exports.markPartnerOffline = exports.markPartnerOnline = exports.isRedisConnected = exports.connectRedis = exports.subClient = exports.pubClient = exports.redisEnabled = void 0;
const ioredis_1 = require("ioredis");
const redisUrl = process.env.REDIS_URL;
exports.redisEnabled = Boolean(redisUrl);
exports.pubClient = redisUrl ? new ioredis_1.Redis(redisUrl, { lazyConnect: true }) : null;
exports.subClient = exports.pubClient ? exports.pubClient.duplicate() : null;
let redisConnected = false;
const attachLogging = (client, name) => {
    if (!client)
        return;
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
attachLogging(exports.pubClient, 'pub');
attachLogging(exports.subClient, 'sub');
const connectRedis = async () => {
    if (!exports.pubClient || !exports.subClient) {
        console.warn('[Redis] REDIS_URL is not set. Socket.IO and Geo Matching are running without Redis.');
        return false;
    }
    try {
        await Promise.all([exports.pubClient.connect(), exports.subClient.connect()]);
        return true;
    }
    catch (error) {
        redisConnected = false;
        console.error('[Redis] Critical: failed to connect. Cross-instance socket events and geo-matching are disabled.', error);
        return false;
    }
};
exports.connectRedis = connectRedis;
const isRedisConnected = () => redisConnected;
exports.isRedisConnected = isRedisConnected;
const markPartnerOnline = async (partnerId) => {
    if (!exports.pubClient || !redisConnected)
        return;
    await exports.pubClient.sadd('partners:online', partnerId);
};
exports.markPartnerOnline = markPartnerOnline;
const markPartnerOffline = async (partnerId) => {
    if (!exports.pubClient || !redisConnected)
        return;
    await exports.pubClient.srem('partners:online', partnerId);
};
exports.markPartnerOffline = markPartnerOffline;
const storePartnerLocation = async (partnerId, lat, lng) => {
    if (!exports.pubClient || !redisConnected)
        return;
    await exports.pubClient
        .multi()
        .hset(`partner_location:${partnerId}`, {
        lat: String(lat),
        lng: String(lng),
        updatedAt: new Date().toISOString(),
    })
        .geoadd('partners:geo', lng, lat, partnerId)
        .exec();
};
exports.storePartnerLocation = storePartnerLocation;
/**
 * Get Redis client for custom operations
 */
const getRedisClient = () => exports.pubClient;
exports.getRedisClient = getRedisClient;
/**
 * Flush Redis cache (for testing/maintenance)
 */
const flushRedis = async () => {
    if (!exports.pubClient || !redisConnected)
        return false;
    try {
        await exports.pubClient.flushdb();
        console.log('[Redis] Database flushed');
        return true;
    }
    catch (error) {
        console.error('[Redis] Failed to flush database:', error);
        return false;
    }
};
exports.flushRedis = flushRedis;
