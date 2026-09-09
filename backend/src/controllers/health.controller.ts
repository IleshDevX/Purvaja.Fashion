import { Request, Response } from 'express';
import { checkDatabaseReadiness } from '../config/database.js';
import { cacheService } from '../services/cache.service.js';
import { env } from '../config/env.js';

export function getHealthStatus(_req: Request, res: Response): void {
  // Liveness only: reports whether the process is alive and accepting connections
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      environment: env.NODE_ENV,
    },
  });
}

export async function getReadinessStatus(_req: Request, res: Response): Promise<void> {
  // 1. Check Database Connectivity
  const dbReadiness = await checkDatabaseReadiness();

  if (!dbReadiness.connected) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service is not ready.',
      },
    });
    return;
  }

  // 2. Check Migrations Readiness in staging/production
  const isDeployEnv =
    env.NODE_ENV === 'production' ||
    env.NODE_ENV === 'staging' ||
    process.env.NODE_ENV === 'production' ||
    process.env.NODE_ENV === 'staging';
  if (isDeployEnv && !dbReadiness.migrationsReady) {
    res.status(503).json({
      success: false,
      error: {
        code: 'MIGRATIONS_PENDING',
        message: 'Pending database migrations must be applied before traffic can be served.',
      },
    });
    return;
  }

  // 3. Check Payment Provider Configuration Readiness
  if (env.PAYMENT_PROVIDER === 'phonepe') {
    const requiredKeys = [
      'PHONEPE_MERCHANT_ID',
      'PHONEPE_CLIENT_ID',
      'PHONEPE_CLIENT_SECRET',
      'PHONEPE_CLIENT_VERSION',
      'PHONEPE_CALLBACK_URL',
    ] as const;
    const missing = requiredKeys.filter(k => !env[k]);
    if (missing.length > 0) {
      res.status(503).json({
        success: false,
        error: {
          code: 'PAYMENT_PROVIDER_MISCONFIGURED',
          message: `PhonePe payment gateway missing required configuration: ${missing.join(', ')}`,
        },
      });
      return;
    }
  } else if (env.NODE_ENV === 'production' && env.PAYMENT_PROVIDER === 'demo') {
    res.status(503).json({
      success: false,
      error: {
        code: 'INVALID_PAYMENT_PROVIDER',
        message: 'Demo payment provider is strictly prohibited in production.',
      },
    });
    return;
  }

  // 4. Redis Subsystem Status
  const redisStatus = env.REDIS_URL
    ? (cacheService.isConnected ? 'connected' : 'fallback_to_postgres')
    : 'not_configured';

  // 5. Email Subsystem Status
  let emailStatus: 'configured' | 'log_only' | 'degraded_log_only' = 'log_only';
  if (env.RESEND_API_KEY) {
    emailStatus = 'configured';
  } else if (isDeployEnv) {
    emailStatus = 'degraded_log_only';
  }

  const paymentStatus = env.PAYMENT_PROVIDER === 'phonepe'
    ? `phonepe_${env.PHONEPE_ENVIRONMENT}`
    : 'demo';

  res.status(200).json({
    success: true,
    data: {
      status: 'ready',
      checks: {
        database: 'connected',
        migrations: dbReadiness.migrationsReady ? 'ready' : 'pending',
        redis: redisStatus,
        email: emailStatus,
        payment: paymentStatus,
      },
    },
  });
}
