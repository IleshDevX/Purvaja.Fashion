import express from 'express';
import request from 'supertest';
import { afterEach, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import { SharedRateLimitStore } from '../../src/services/rate-limit-store.js';
import { createLimiter } from '../../src/middleware/rate-limit.middleware.js';

const original = env.RATE_LIMIT_REDIS_URL;
afterEach(() => { env.RATE_LIMIT_REDIS_URL = original; vi.restoreAllMocks(); });

it('fails closed when the configured shared store is unavailable', async () => {
  env.RATE_LIMIT_REDIS_URL = 'redis://127.0.0.1:1';
  vi.spyOn(SharedRateLimitStore.prototype, 'increment').mockRejectedValue(new Error('Store unavailable'));
  const app = express();
  app.use(createLimiter({ windowMs: 60000, prodMax: 2, code: 'TEST_QUOTA', message: 'Limited' }));
  const handler = vi.fn((_req, res) => res.sendStatus(204));
  app.get('/', handler);
  expect((await request(app).get('/')).status).toBe(500);
  expect(handler).not.toHaveBeenCalled();
});

it('gives global and sensitive quotas distinct stable namespaces', () => {
  const first = new SharedRateLimitStore('LOGIN', 60000);
  const secondProcess = new SharedRateLimitStore('LOGIN', 60000);
  const global = new SharedRateLimitStore('GLOBAL', 60000);
  expect(first.prefix).toBe(secondProcess.prefix);
  expect(first.prefix).not.toBe(global.prefix);
});
