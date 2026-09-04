import compression from 'compression';
import express, { Express } from 'express';
import { env } from './config/env.js';
import { applySecurityMiddleware } from './middleware/security.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { getHealthStatus, getReadinessStatus } from './controllers/health.controller.js';
import routes from './routes/index.js';

function parseTrustProxy(val: string): boolean | number | string {
  if (val.toLowerCase() === 'true') return true;
  if (val.toLowerCase() === 'false') return false;
  const num = Number(val);
  if (!Number.isNaN(num)) return num;
  return val;
}

export function createApp(): Express {
  const app = express();

  // Reverse proxy configuration for Hostinger / Nginx / Cloudflare
  app.set('trust proxy', parseTrustProxy(env.TRUST_PROXY));

  // Top-level liveness & readiness aliases for reverse proxies and health probes
  app.get('/healthz', getHealthStatus);
  app.get('/readyz', getReadinessStatus);

  // Security and request parsing
  applySecurityMiddleware(app);

  // Compress text responses after security headers have been applied.
  app.use(compression());

  // Routes
  app.use(routes);

  // 404 handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
