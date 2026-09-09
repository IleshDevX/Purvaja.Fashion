import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env, getDatabaseUrl } from './env.js';
import { logger } from '../utils/logger.js';
import { metrics } from '../utils/metrics.js';

let prismaClient: PrismaClient | undefined;

function expectedMigrationNames(): string[] {
  try {
    const migrationsUrl = new URL('../../prisma/migrations/', import.meta.url);
    return readdirSync(fileURLToPath(migrationsUrl), { withFileTypes: true })
      .filter(entry => entry.isDirectory() && /^\d+_/.test(entry.name))
      .map(entry => entry.name)
      .sort();
  } catch {
    return [];
  }
}

function databaseFailureReason(error: unknown): string {
  if (error instanceof Error && error.message.startsWith('Invalid DATABASE_URL:')) {
    return error.message;
  }

  return 'Unable to establish a PostgreSQL connection.';
}

export function getPrismaClient(): PrismaClient {
  if (env.NODE_ENV === 'test' && !process.env.TEST_DATABASE_URL) {
    throw new Error('Database tests require TEST_DATABASE_URL pointing to a disposable test database.');
  }
  if (!prismaClient) {
    // Prisma's JavaScript query engine may schedule statements concurrently
    // while resolving one nested mutation. Explicit pg pipeline mode keeps
    // those statements ordered on the transaction connection and is required
    // by pg 9's concurrency contract.
    const adapter = new PrismaPg({ connectionString: getDatabaseUrl(), pipeline: true });
    prismaClient = new PrismaClient({ adapter });
  }

  return prismaClient;
}

export async function connectDatabase(): Promise<void> {
  try {
    await getPrismaClient().$connect();
    logger.info('PostgreSQL database connection established.');
  } catch (error) {
    logger.error(
      {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        reason: databaseFailureReason(error),
      },
      'PostgreSQL database connection failed.',
    );
    throw error;
  }
}

export async function checkDatabaseReadiness(timeoutMs = 3000): Promise<{
  connected: boolean;
  migrationsReady: boolean;
  reason?: string;
}> {
  const performCheck = async () => {
    try {
      const client = getPrismaClient();
      await client.$queryRaw`SELECT 1`;
      metrics.recordDbQuery(true);

      let migrationsReady = true;
      try {
        const result = await client.$queryRaw<Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>>`
          SELECT "migration_name", "finished_at", "rolled_back_at"
          FROM "_prisma_migrations";
        `;
        metrics.recordDbQuery(true);
        const applied = new Set(
          result
            .filter(row => row.finished_at !== null && row.rolled_back_at === null)
            .map(row => row.migration_name),
        );
        const expected = expectedMigrationNames();
        migrationsReady = expected.length > 0 && expected.every(name => applied.has(name));
      } catch {
        // Minimal development/test setups may not create the migrations table.
        // Deployment environments must fail readiness instead of masking drift.
        migrationsReady = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
      }

      return { connected: true, migrationsReady };
    } catch (error) {
      metrics.recordDbQuery(false, false);
      logger.warn(
        { errorName: error instanceof Error ? error.name : 'UnknownError' },
        'PostgreSQL readiness check failed.',
      );
      return { connected: false, migrationsReady: false, reason: 'connection_failed' };
    }
  };

  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<{ connected: false; migrationsReady: false; reason: string }>((resolve) => {
    timer = setTimeout(() => {
      metrics.recordDbQuery(false, true);
      logger.warn({ timeoutMs }, 'PostgreSQL readiness check timed out.');
      resolve({ connected: false, migrationsReady: false, reason: 'timeout' });
    }, timeoutMs);
  });

  try {
    return await Promise.race([performCheck(), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  const readiness = await checkDatabaseReadiness();
  return readiness.connected;
}

export async function disconnectDatabase(): Promise<void> {
  if (!prismaClient) {
    return;
  }

  try {
    await prismaClient.$disconnect();
    logger.info('PostgreSQL database connection closed.');
  } finally {
    prismaClient = undefined;
  }
}
