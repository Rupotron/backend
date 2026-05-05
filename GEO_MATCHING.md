# Redis-Based Geo Matching Engine

High-performance partner discovery system with sub-100ms latency using Redis Geo queries.

## Overview

This system replaces the database-heavy matching with Redis Geo queries for real-time partner discovery. It's designed to handle thousands of concurrent requests with minimal latency.

**Performance Target:** < 100ms per match query

## Architecture

### Data Model

#### 1. Geo Index
- **Key:** `partners:geo`
- **Type:** GEOSET (Redis Geo index)
- **Content:** Partner locations (longitude, latitude, partnerId)
- **Usage:** Fast radius-based searches

#### 2. Online Partners Set
- **Key:** `partners:online`
- **Type:** SET
- **Content:** Partner IDs currently online
- **Usage:** Quick online status checks

#### 3. Partner Metrics
- **Key:** `partner:metrics:{partnerId}`
- **Type:** HASH
- **Fields:**
  - `rating`: Partner rating (0-5)
  - `completionRate`: Percentage of completed jobs
  - `totalJobs`: Total jobs done
  - `isBusy`: Current busy status
  - `updatedAt`: Last update timestamp
- **TTL:** 10 minutes (600s)
- **Usage:** Scoring and ranking

#### 4. Partner Services
- **Key:** `partner:services:{partnerId}`
- **Type:** SET
- **Content:** Service IDs supported by partner
- **TTL:** 30 minutes (1800s)
- **Usage:** Filter by service capability

#### 5. Last Assignment Tracking
- **Key:** `partner:lastAssigned:{partnerId}`
- **Type:** String (value: "1")
- **TTL:** 1 hour (3600s)
- **Usage:** Load balancing (prevents same partner getting all jobs)

## API Endpoints

### 1. Match Service Request (V2)

**Endpoint:** `POST /api/v1/match/v2`

**Request:**
```json
{
  "serviceId": "service-123",
  "latitude": 28.6139,
  "longitude": 77.2090
}
```

**Response (Success):**
```json
{
  "success": true,
  "redisEnabled": true,
  "partners": [
    {
      "partnerId": "partner-1",
      "name": "John Doe",
      "distance": 2.5,
      "score": 0.8934,
      "rating": 4.8,
      "completionRate": 95.2,
      "estimatedArrival": "13 mins"
    },
    {
      "partnerId": "partner-2",
      "name": "Jane Smith",
      "distance": 3.1,
      "score": 0.8721,
      "rating": 4.6,
      "completionRate": 92.1,
      "estimatedArrival": "15 mins"
    }
  ]
}
```

**Response (Fallback to DB):**
```json
{
  "success": true,
  "redisEnabled": false,
  "partners": [...]
}
```

### 2. Update Partner Location

**Endpoint:** `POST /api/v1/match/location`

**Request:**
```json
{
  "partnerId": "partner-123",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "isOnline": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Partner location updated"
}
```

**Called by:** Partner app (every 10-30 seconds when partner is online)

### 3. Sync Partner Metrics

**Endpoint:** `POST /api/v1/match/sync-metrics`

**Request:**
```json
{
  "partnerId": "partner-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Partner metrics synced"
}
```

**Called by:** Backend (after job completion, rating update, etc.)

### 4. Get Matching Metrics

**Endpoint:** `GET /api/v1/match/metrics`

**Response:**
```json
{
  "success": true,
  "metrics": {
    "avg_match_time_ms": 87.4,
    "avg_partners_found": 4.2,
    "match_success_rate": "98.5%",
    "total_matches": 1250,
    "total_successful_matches": 1231
  },
  "health": {
    "redis_connected": true,
    "metrics": {
      "avg_match_time_ms": 87.4,
      "avg_partners_found": 4.2,
      "match_success_rate": "98.5%",
      "total_matches": 1250,
      "total_successful_matches": 1231
    }
  }
}
```

## Matching Algorithm

### Step 1: Geo Search
Uses Redis `GEORADIUS` to find partners within expanding radius:
- Try 3 km first
- Expand to 5 km if no results
- Expand to 10 km if still no results
- Expand to 20 km as final attempt

### Step 2: Filter Online
Check if partner is in `partners:online` SET

### Step 3: Filter by Service
Check if partner supports requested service using `partner:services:{partnerId}`

### Step 4: Fetch Metrics
Get partner metrics from Redis HASH

### Step 5: Score Computation

```
Score = (0.4 × distanceScore) + 
        (0.3 × ratingScore) + 
        (0.2 × completionScore) + 
        (0.1 × availabilityScore)
```

Where:
- **distanceScore** = 1 - (distance / 10) [normalized 0-1 for 0-10km]
- **ratingScore** = rating / 5
- **completionScore** = completedJobs / totalJobs
- **availabilityScore** = 1 if online and not busy, else 0

**Load Balancing Penalty:**
- If partner was recently assigned (in last hour), multiply score by 0.7

### Step 6: Sort & Return
Sort by score (descending), then distance (ascending), return top 3-5 partners

## Setup & Initialization

### 1. Prerequisites

```bash
# Ensure Redis is running
redis-cli ping  # Should return PONG

# Set REDIS_URL in backend .env
REDIS_URL=redis://localhost:6379
```

### 2. Initialize Geo Index

Run once to populate Redis with existing partner data:

```bash
cd backend
npm run seed          # First seed database
npm run init:geo-matching  # Then initialize geo index
```

### 3. Verify Setup

```bash
# Check Redis connection
redis-cli INFO server

# Check geo index
redis-cli ZCARD partners:geo

# Check online partners
redis-cli SCARD partners:online

# Get sample metrics
redis-cli HGETALL partner:metrics:some-partner-id
```

## Performance Tuning

### Redis Configuration

Add to `redis.conf`:
```
# For geo operations
geo-max-cache-size 1024
geo-precision 26

# For high concurrency
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Backend Optimization

```typescript
// Increase connection pool
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: true,
  lazyConnect: true,
  connectTimeout: 10000,
  retryStrategy: () => 100, // Retry every 100ms
});
```

### Monitoring

Track these metrics:
- **avg_match_time_ms** - Should be < 100ms
- **avg_partners_found** - Should be 3-5 usually
- **match_success_rate** - Should be > 95%

Use endpoint: `GET /api/v1/match/metrics`

## Fallback Strategy

If Redis is unavailable or fails:

1. System automatically falls back to DB-based Haversine matching
2. Response includes `"redisEnabled": false`
3. Latency increases to ~500-1000ms but service continues
4. No data loss or degradation

## Load Balancing

To prevent the same partner from getting all jobs:

```typescript
// Automatically applied in scoring
if (recentlyAssigned) {
  score *= 0.7; // 30% penalty for last hour
}
```

This ensures fair distribution across available partners.

## Caching Strategy

| Cache Type | TTL | Update Frequency | Impact |
|-----------|-----|-----------------|--------|
| Metrics | 10 min | On-demand sync | Medium |
| Services | 30 min | On service change | Medium |
| Geo Index | Real-time | On location update | High |
| Online Status | Real-time | On status change | High |

## Monitoring Dashboard

Key metrics to track:

```json
{
  "p50_match_time": 45,
  "p95_match_time": 95,
  "p99_match_time": 150,
  "partners_found_avg": 4.2,
  "online_partners": 342,
  "redis_memory_mb": 156,
  "match_requests_per_min": 450
}
```

## Troubleshooting

### Issue: No partners found
- Check online partners: `redis-cli SCARD partners:online`
- Check geo index: `redis-cli ZCARD partners:geo`
- Run initialization: `npm run init:geo-matching`

### Issue: High latency (> 200ms)
- Check Redis memory usage: `redis-cli INFO memory`
- Check network latency: `redis-cli PING`
- Consider increasing Redis max connections

### Issue: Redis connection fails
- Verify Redis is running: `redis-cli ping`
- Check REDIS_URL in .env
- Check firewall/network settings

### Issue: Partners not updating location
- Verify partner app is sending location: check backend logs
- Check partner online status: `redis-cli SCARD partners:online`
- Verify location update endpoint is working

## Future Improvements

1. **Cluster Support** - Use Redis Cluster for horizontal scaling
2. **Advanced Scoring** - Add machine learning for better matching
3. **Real-time Notifications** - Use Redis Streams for instant updates
4. **Caching Layer** - Add caching for frequently matched routes
5. **Analytics** - Detailed matching analytics and heatmaps

## References

- [Redis Geo Commands](https://redis.io/commands/geoadd/)
- [ioredis Documentation](https://luin.github.io/ioredis/)
- [Redis Performance Tuning](https://redis.io/topics/optimization)
