# Production Redis Architecture & Configuration Guide

Purvaja Fashion utilizes Redis for two mission-critical, low-latency workloads:
1. **Distributed Rate Limiting:** Enforces bounded request rates across containerized replicas (`backend/src/middleware/rate-limit.middleware.ts`).
2. **Catalog & Cache Invalidation:** Caches product listings, categories, and inventory counts with sub-millisecond retrieval (`backend/src/services/cache.service.ts`).

---

## 1. Resilience & Fallback Guarantees

The application is engineered with an **automatic memory fallback**:
* If `REDIS_URL` or `RATE_LIMIT_REDIS_URL` is omitted, or if the Redis node is temporarily unreachable, the system automatically falls back to an in-memory sliding window limiter and in-process LRU cache.
* Production startup will **never crash** solely due to Redis connection latency; it will log a warning and degrade gracefully without blocking checkout or browsing.

---

## 2. Recommended Managed Redis Deployments

### Option A: Upstash Serverless Redis (Recommended for Cloud / Multi-region)
* **Setup:** Create a free or standard database at [Upstash](https://upstash.com/).
* **TLS:** Enabled by default with `rediss://` protocol.
* **Connection String:**
  ```bash
  REDIS_URL=rediss://default:YOUR_PASSWORD@your-endpoint.upstash.io:6379
  RATE_LIMIT_REDIS_URL=rediss://default:YOUR_PASSWORD@your-endpoint.upstash.io:6379
  ```

### Option B: Hostinger VPS Native Redis (Recommended for Cost & Lowest Latency)
When hosting on a Hostinger VPS alongside PM2 / Docker:
1. Install Redis 7 on Ubuntu:
   ```bash
   sudo apt-get update && sudo apt-get install -y redis-server
   sudo systemctl enable --now redis-server
   ```
2. Configure `/etc/redis/redis.conf`:
   - Bind to loopback: `bind 127.0.0.1 ::1`
   - Set strong authentication: `requirepass YOUR_STRONG_GENERATED_PASSWORD`
   - Set eviction policy: `maxmemory-policy allkeys-lru`
   - Set max memory: `maxmemory 512mb`
3. Restart service: `sudo systemctl restart redis-server`
4. Set in `backend/.env`:
   ```bash
   REDIS_URL=redis://:YOUR_STRONG_GENERATED_PASSWORD@127.0.0.1:6379
   ```

---

## 3. Verification Commands

To verify Redis connectivity and live operations from the backend:

```bash
pnpm --filter @ecommerce/prototype-b-backend test tests/unit/cache.service.test.ts
pnpm --filter @ecommerce/prototype-b-backend test tests/unit/rate-limit-store.test.ts
```
