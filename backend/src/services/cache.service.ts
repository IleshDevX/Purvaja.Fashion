import { createClient, type RedisClientType } from 'redis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

type Cacheable = Record<string, unknown> | unknown[];

/**
 * Optional shared cache. A missing or unavailable Redis instance never blocks
 * a request; PostgreSQL remains the source of truth.
 */
export class CacheService {
  private client: RedisClientType | undefined;

  async connect(): Promise<void> {
    if (!env.REDIS_URL || this.client?.isReady) return;

    const client = createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: 2_000,
        reconnectStrategy: false,
      },
    });
    client.on('error', error => {
      logger.warn({ errorName: error.name }, 'Redis cache operation failed; using PostgreSQL.');
    });

    try {
      await client.connect();
      this.client = client;
      logger.info('Redis cache connected.');
    } catch (error) {
      logger.warn(
        { errorName: error instanceof Error ? error.name : 'UnknownError' },
        'Redis cache is unavailable; continuing without cache.',
      );
      if (client.isOpen) {
        await client.disconnect().catch(() => undefined);
      }
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    const client = this.client;
    this.client = undefined;
    if (client.isOpen) {
      await client.disconnect().catch(() => undefined);
    }
  }

  async getOrSet<T extends Cacheable>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;

    const value = await loader();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  private async get<T extends Cacheable>(key: string): Promise<T | undefined> {
    if (!this.client?.isReady) return undefined;
    try {
      const value = await this.client.get(key);
      return value === null ? undefined : JSON.parse(value) as T;
    } catch (error) {
      logger.warn({ errorName: error instanceof Error ? error.name : 'UnknownError' }, 'Redis cache read failed.');
      return undefined;
    }
  }

  private async set(key: string, value: Cacheable, ttlSeconds: number): Promise<void> {
    if (!this.client?.isReady) return;
    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (error) {
      logger.warn({ errorName: error instanceof Error ? error.name : 'UnknownError' }, 'Redis cache write failed.');
    }
  }
}

export const cacheService = new CacheService();
