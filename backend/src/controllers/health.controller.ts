import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database.js';

export function getHealthStatus(_req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV ?? 'development',
    },
  });
}

export async function getReadinessStatus(_req: Request, res: Response): Promise<void> {
  const databaseReady = await checkDatabaseConnection();

  if (!databaseReady) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service is not ready.',
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      status: 'ready',
    },
  });
}
