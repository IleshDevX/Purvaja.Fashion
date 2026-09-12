import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import express, { Express } from 'express';
import { env } from './config/env.js';
import { applySecurityMiddleware } from './middleware/security.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { getHealthStatus, getReadinessStatus } from './controllers/health.controller.js';
import { requestIdMiddleware } from './middleware/requestId.middleware.js';
import { boundedRouteLabel, metrics } from './utils/metrics.js';
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

  // Attach correlation and request ID tracking
  app.use(requestIdMiddleware);

  // Operational HTTP metrics collection
  app.use((req, res, next) => {
    metrics.requestStarted();
    const start = performance.now();
    res.on('finish', () => {
      const durationMs = performance.now() - start;
      metrics.requestCompleted(boundedRouteLabel(req), res.statusCode, durationMs);
    });
    next();
  });

  // Reverse proxy configuration for Hostinger / Nginx / Cloudflare
  app.set('trust proxy', parseTrustProxy(env.TRUST_PROXY));

  // Top-level liveness & readiness aliases for reverse proxies and health probes
  app.get('/healthz', getHealthStatus);
  app.get('/readyz', getReadinessStatus);

  // Security and request parsing
  applySecurityMiddleware(app);

  // Compress text responses after security headers have been applied.
  app.use(compression());

  // Static uploads directory (for product images uploaded locally or on VPS)
  const uploadsDir = join(fileURLToPath(new URL('../../', import.meta.url)), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Routes
  app.use(routes);

  // A production release contains the frontend beside the backend. Serving both
  // from one process gives every SPA route and /api/v1 the same origin while
  // still allowing a reverse proxy to serve the same immutable files directly.
  const frontendDir = join(fileURLToPath(new URL('../../', import.meta.url)), 'frontend', 'dist');
  const frontendIndex = join(frontendDir, 'index.html');
  if (existsSync(frontendIndex)) {
    app.use(express.static(frontendDir, { index: false }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
      res.sendFile(frontendIndex);
    });
  }

  // 404 handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
