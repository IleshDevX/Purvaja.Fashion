import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { getDatabaseUrl } from './env.js';
import { logger } from '../utils/logger.js';

let prismaClient: PrismaClient | undefined;

function databaseFailureReason(error: unknown): string {
  if (error instanceof Error && error.message.startsWith('Invalid DATABASE_URL:')) {
    return error.message;
  }

  return 'Unable to establish a PostgreSQL connection.';
}

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
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

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.warn(
      { errorName: error instanceof Error ? error.name : 'UnknownError' },
      'PostgreSQL readiness check failed.',
    );
    return false;
  }
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
