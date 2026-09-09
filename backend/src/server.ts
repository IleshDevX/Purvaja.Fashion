import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { cacheService } from './services/cache.service.js';
import { disconnectRateLimitStore } from './services/rate-limit-store.js';
import { metricsAggregationService } from './services/metrics-aggregation.service.js';
import { ReservationCleanupWorker } from './services/reservation-worker.service.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

let isShuttingDown = false;

export async function startServer(): Promise<Server> {
  logger.info({ environment: env.NODE_ENV }, 'Starting application.');
  await connectDatabase();
  await cacheService.connect();
  await metricsAggregationService.start();

  // Start background reservation cleanup worker singleton
  ReservationCleanupWorker.getInstance().start(60_000);

  return await new Promise<Server>((resolve, reject) => {
    const server = app.listen(env.PORT, env.HOST, () => {
      logger.info({ port: env.PORT, host: env.HOST }, 'HTTP server is accepting requests.');
      if (typeof process.send === 'function') {
        process.send('ready');
      }
      resolve(server);
    });
    server.once('error', reject);
  });
}

export async function stopServer(server: Server, signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  // Stop background reservation cleanup worker cleanly
  ReservationCleanupWorker.getInstance().stop();

  logger.info(`${signal} received: closing HTTP server gracefully.`);
  const shutdownTimeout = setTimeout(() => {
    logger.warn('Forcefully terminating process after graceful shutdown timeout.');
    process.exit(1);
  }, 10_000);
  shutdownTimeout.unref();

  await new Promise<void>((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
        return;
      }
      logger.info('HTTP server closed.');
      resolve();
    });
  });
  await disconnectDatabase();
  await cacheService.disconnect();
  await metricsAggregationService.stop();
  await disconnectRateLimitStore();
  clearTimeout(shutdownTimeout);
}

async function run(): Promise<void> {
  try {
    const server = await startServer();
    const shutdown = (signal: string): void => {
      void stopServer(server, signal)
        .then(() => process.exit(0))
        .catch(error => {
          logger.error({ errorName: error instanceof Error ? error.name : 'UnknownError' }, 'Shutdown failed.');
          process.exit(1);
        });
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error({ errorName: error instanceof Error ? error.name : 'UnknownError' }, 'Application startup failed.');
    await cacheService.disconnect();
    await disconnectDatabase();
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void run();
}
