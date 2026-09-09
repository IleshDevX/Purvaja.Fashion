import { randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { SharedRateLimitStore, disconnectRateLimitStore } from '../../src/services/rate-limit-store.js';

afterAll(disconnectRateLimitStore);
it.skipIf(!env.RATE_LIMIT_REDIS_URL)('shares atomic quotas between store instances and expires the window', async () => {
  const namespace = `test-${randomUUID()}`;
  const stores = [new SharedRateLimitStore(namespace, 1000), new SharedRateLimitStore(namespace, 1000)];
  const hits = await Promise.all(Array.from({ length: 10 }, (_, i) => stores[i % 2]!.increment('client')));
  expect(hits.map(hit => hit.totalHits).sort((a, b) => a - b)).toEqual([1,2,3,4,5,6,7,8,9,10]);
  await new Promise(resolve => setTimeout(resolve, 1100));
  expect((await stores[1]!.increment('client')).totalHits).toBe(1);
  await stores[0]!.resetKey('client');
});
