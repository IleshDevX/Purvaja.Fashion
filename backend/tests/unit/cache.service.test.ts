import { describe, expect, it, vi } from 'vitest';
import { CacheService } from '../../src/services/cache.service.js';
import { env } from '../../src/config/env.js';

describe('CacheService', () => {
  it('uses the loader when Redis is not configured (graceful PostgreSQL fallback)', async () => {
    const cache = new CacheService();
    const loader = vi.fn().mockResolvedValue({ source: 'database' });
    const result = await cache.getOrSet('test:cache:fallback', 60, loader);
    expect(result).toEqual({ source: 'database' });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('handles an unreachable Redis instance gracefully without throwing', async () => {
    const originalUrl = env.REDIS_URL;
    try {
      (env as { REDIS_URL?: string }).REDIS_URL = 'redis://127.0.0.1:1'; // Dead port
      const cache = new CacheService();
      await cache.connect(); // Must not throw unhandled exception
      const loader = vi.fn().mockResolvedValue({ fallback: true });
      const result = await cache.getOrSet('test:unreachable', 60, loader);
      expect(result).toEqual({ fallback: true });
      expect(loader).toHaveBeenCalledTimes(1);
    } finally {
      (env as { REDIS_URL?: string }).REDIS_URL = originalUrl;
    }
  });

  it('serves cache hits without invoking the loader when a Redis client is active', async () => {
    const cache = new CacheService();
    const inMemoryStorage = new Map<string, string>();
    const mockClient = {
      isOpen: true,
      isReady: true,
      get: vi.fn(async (k: string) => inMemoryStorage.get(k) ?? null),
      set: vi.fn(async (k: string, v: string, _opts?: { EX?: number }) => {
        inMemoryStorage.set(k, v);
        return 'OK';
      }),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    (cache as unknown as { client: typeof mockClient }).client = mockClient;

    const loader = vi.fn().mockResolvedValue({ id: 'p-1', name: 'Linen Shirt' });

    // 1. Initial call -> Cache Miss -> invokes loader and writes to Redis with TTL
    const firstCall = await cache.getOrSet('product:reviews:p-1', 60, loader);
    expect(firstCall).toEqual({ id: 'p-1', name: 'Linen Shirt' });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(mockClient.set).toHaveBeenCalledWith(
      'product:reviews:p-1',
      JSON.stringify({ id: 'p-1', name: 'Linen Shirt' }),
      { EX: 60 },
    );

    // 2. Subsequent call -> Cache Hit -> served from Redis, loader NOT called
    const secondCall = await cache.getOrSet('product:reviews:p-1', 60, loader);
    expect(secondCall).toEqual({ id: 'p-1', name: 'Linen Shirt' });
    expect(loader).toHaveBeenCalledTimes(1);

    // 3. Disconnect
    await cache.disconnect();
    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it('runs live integration with a real Redis server when REDIS_URL is reachable', async () => {
    if (!env.REDIS_URL) return;

    const cache = new CacheService();
    await cache.connect();
    const key = `live:test:${Date.now()}`;
    const loader = vi.fn().mockResolvedValue({ live: 'ok' });

    const res1 = await cache.getOrSet(key, 10, loader);
    expect(res1).toEqual({ live: 'ok' });
    expect(loader).toHaveBeenCalledTimes(1);

    const res2 = await cache.getOrSet(key, 10, loader);
    expect(res2).toEqual({ live: 'ok' });
    expect(loader).toHaveBeenCalledTimes(1);

    await cache.disconnect();
  });
});

