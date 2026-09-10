import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../src/utils/logger.js';
import { createLimiter } from '../../src/middleware/rate-limit.middleware.js';
import { errorHandler } from '../../src/middleware/error.middleware.js';
import { env } from '../../src/config/env.js';

const originalEnvironment = env.NODE_ENV;
afterEach(() => { env.NODE_ENV = originalEnvironment; vi.restoreAllMocks(); });

describe('HTTP trust boundaries', () => {
  it('never logs bearer query values or parser input', async () => {
    const log = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const app = express();
    app.use(express.json());
    app.post('/', (_req, _res, next) => next(new Error('internal failure')));
    app.use(errorHandler);
    await request(app).post('/?token=bearer-secret').set('Content-Type', 'application/json').send('{"token":"body-secret"');
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/bearer-secret|body-secret/);
  });
  it('ignores client-selected identity and quota headers outside tests', async () => {
    env.NODE_ENV = 'development';
    const app = express();
    app.set('trust proxy', false);
    app.use(createLimiter({ windowMs: 60000, prodMax: 2, code: 'LIMITED', message: 'Limited' }));
    app.get('/', (_req, res) => { res.sendStatus(204); });
    const statuses = [];
    for (let i = 0; i < 3; i++) {
      statuses.push((await request(app).get('/').set('X-Test-Client-Id', `spoof-${i}`)
        .set('X-Forwarded-For', `192.0.2.${i + 1}`).set('X-Test-Rate-Limit-Max', '999')).status);
    }
    expect(statuses).toEqual([204, 204, 429]);
  });

  it('groups rotating IPv6 interface addresses into one client quota', async () => {
    env.NODE_ENV = 'development';
    const app = express();
    app.set('trust proxy', 1);
    app.use(createLimiter({ windowMs: 60000, prodMax: 2, code: 'LIMITED', message: 'Limited' }));
    app.get('/', (_req, res) => { res.sendStatus(204); });
    const statuses = [];
    for (const address of ['2001:db8:1234:5600::1', '2001:db8:1234:5601::2', '2001:db8:1234:5602::3']) {
      statuses.push((await request(app).get('/').set('X-Forwarded-For', address)).status);
    }
    expect(statuses).toEqual([204, 204, 429]);
  });

  it('preserves safe parser status while hiding the submitted body', async () => {
    const app = express();
    app.use(express.json({ limit: 32 }));
    app.post('/', (_req, res) => { res.sendStatus(204); });
    app.use(errorHandler);
    const invalid = await request(app).post('/').set('Content-Type', 'application/json').send('{secret');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_JSON');
    expect(JSON.stringify(invalid.body)).not.toContain('secret');
    const large = await request(app).post('/').send({ value: 'a'.repeat(100) });
    expect(large.status).toBe(413);
  });

  it('preserves route-specific rate limiter error codes when global limiter sets allowTestLimitOverride: false', async () => {
    env.NODE_ENV = 'test';
    const app = express();
    const globalLimiter = createLimiter({
      windowMs: 60000,
      prodMax: 100,
      testMax: 50000,
      allowTestLimitOverride: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Global limited',
    });
    const authLimiter = createLimiter({
      windowMs: 60000,
      prodMax: 5,
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Auth limited',
    });
    app.use('/api', globalLimiter);
    app.post('/api/auth/login', authLimiter, (_req, res) => res.sendStatus(200));

    const clientId = 'route-limiter-precedence-test';
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Test-Rate-Limit-Max', '3')
        .set('X-Test-Client-Id', clientId);
      expect(res.status).toBe(200);
    }
    const fourth = await request(app)
      .post('/api/auth/login')
      .set('X-Test-Rate-Limit-Max', '3')
      .set('X-Test-Client-Id', clientId);
    expect(fourth.status).toBe(429);
    expect(fourth.body.error.code).toBe('AUTH_RATE_LIMIT_EXCEEDED');
  });
});
