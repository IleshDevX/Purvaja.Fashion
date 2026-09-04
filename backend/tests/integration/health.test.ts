import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { checkDatabaseConnection } = vi.hoisted(() => ({
  checkDatabaseConnection: vi.fn(),
}));

vi.mock('../../src/config/database.js', () => ({
  checkDatabaseConnection,
}));

import { app } from '../../src/app.js';

describe('GET /health', () => {
  beforeEach(() => {
    checkDatabaseConnection.mockReset();
  });

  it('should return 200 OK with healthy status payload', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('status', 'healthy');
    expect(response.body.data).toHaveProperty('timestamp');
    expect(response.body.data).toHaveProperty('uptime');
    expect(response.body.data).toHaveProperty('environment');
  });

  it('should return 200 OK when accessed via /api/v1/health', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('status', 'healthy');
  });

  it('should return 404 for non-existent routes with standardized error structure', async () => {
    const response = await request(app).get('/api/v1/non-existent-endpoint');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(response.body.error).toHaveProperty('message');
  });

  it('should return ready only after a successful database connectivity check', async () => {
    checkDatabaseConnection.mockResolvedValue(true);

    const response = await request(app).get('/api/v1/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { status: 'ready' },
    });
    expect(checkDatabaseConnection).toHaveBeenCalledOnce();
  });

  it('should return unavailable when PostgreSQL cannot be reached', async () => {
    checkDatabaseConnection.mockResolvedValue(false);

    const response = await request(app).get('/api/v1/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service is not ready.',
      },
    });
    expect(checkDatabaseConnection).toHaveBeenCalledOnce();
  });
});
