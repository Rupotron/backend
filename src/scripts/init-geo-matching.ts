/**
 * Redis Geo Matching System Initialization Script
 * Run this once to set up the Redis geo index with existing partner data
 * 
 * Usage: npm run init:geo-matching
 */

import { pubClient as redis, connectRedis } from '../config/redis';
import { prisma } from '../config/prisma';
import { clearGeoData, initializeGeoIndex, getGeoStats } from '../utils/redisGeo';

const main = async () => {
  try {
    console.log('[GeoInit] Starting Redis geo matching initialization...\n');

    // Connect to Redis
    const redisConnected = await connectRedis();
    if (!redisConnected) {
      console.warn('[GeoInit] ⚠️  Redis connection failed. Geo matching will use DB fallback.\n');
      return;
    }

    console.log('[GeoInit] ✓ Connected to Redis\n');

    // Clear existing data
    console.log('[GeoInit] Clearing existing geo data...');
    await clearGeoData();
    console.log('[GeoInit] ✓ Cleared\n');

    // Initialize geo index
    console.log('[GeoInit] Initializing geo index with partner data...');
    const success = await initializeGeoIndex();

    if (success) {
      console.log('[GeoInit] ✓ Geo index initialized\n');

      // Show stats
      const stats = await getGeoStats();
      if (stats) {
        console.log('[GeoInit] 📊 Geo Matching Stats:');
        console.log(`  • Online Partners: ${stats.onlinePartnersCount}`);
        console.log(`  • Total Partners (Geo): ${stats.totalPartnersInGeo}`);
        console.log(`  • Metrics Stored: ${stats.metricsStoredCount}`);
        console.log(`  • Services Cached: ${stats.servicesStoredCount}\n`);
      }
    } else {
      console.error('[GeoInit] ✗ Failed to initialize geo index\n');
    }

    console.log('[GeoInit] ✅ Initialization complete!');
  } catch (error) {
    console.error('[GeoInit] ✗ Initialization failed:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
};

main();
