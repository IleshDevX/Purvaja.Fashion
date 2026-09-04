import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

let isShuttingDown = false;

export async function startServer(): Promise<Server> {
  logger.info({ environment: env.NODE_ENV }, 'Starting application.');
  await connectDatabase();

  return await new Promise<Server>((resolve, reject) => {
    const server = app.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'HTTP server is accepting requests.');
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

  logger.info(`${signal} received: closing HTTP server gracefully.`);
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
    await disconnectDatabase();
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void run();
}
