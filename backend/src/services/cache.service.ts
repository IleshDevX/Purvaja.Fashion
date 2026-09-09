import { createClient, type RedisClientType } from 'redis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { metrics } from '../utils/metrics.js';

type Cacheable = Record<string, unknown> | unknown[];

/**
 * Optional shared cache. A missing or unavailable Redis instance never blocks
 * a request; PostgreSQL remains the source of truth.
 */
export class CacheService {
  private client: RedisClientType | undefined;

  get isConnected(): boolean {
    return Boolean(this.client?.isReady);
  }

  async connect(): Promise<void> {
    if (!env.REDIS_URL || this.client?.isReady) return;

    const client = createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: 2_000,
        reconnectStrategy: retries => (retries > 5 ? new Error('Redis max retries reached') : Math.min(retries * 100, 2_000)),
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
    if (!this.client?.isReady) {
      metrics.recordRedisOp('fallback');
      return undefined;
    }
    try {
      const value = await this.client.get(key);
      metrics.recordRedisOp(value === null ? 'miss' : 'hit');
      return value === null ? undefined : JSON.parse(value) as T;
    } catch (error) {
      metrics.recordRedisOp('error');
      logger.warn({ errorName: error instanceof Error ? error.name : 'UnknownError' }, 'Redis cache read failed.');
      return undefined;
    }
  }

  private async set(key: string, value: Cacheable, ttlSeconds: number): Promise<void> {
    if (!this.client?.isReady) return;
    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (error) {
      metrics.recordRedisOp('error');
      logger.warn({ errorName: error instanceof Error ? error.name : 'UnknownError' }, 'Redis cache write failed.');
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client?.isReady) return;
    try {
      await this.client.del(key);
    } catch (error) {
      metrics.recordRedisOp('error');
      logger.warn({ errorName: error instanceof Error ? error.name : 'UnknownError' }, 'Redis cache delete failed.');
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.client?.isReady) return;
    try {
      for await (const keyOrKeys of this.client.scanIterator({ MATCH: pattern })) {
        const batch = Array.isArray(keyOrKeys) ? (keyOrKeys as string[]) : [keyOrKeys as string];
        await Promise.all(batch.map(k => this.client!.del(k)));
      }
    } catch (error) {
      metrics.recordRedisOp('error');
      logger.warn({ errorName: error instanceof Error ? error.name : 'UnknownError' }, 'Redis cache deletePattern failed.');
    }
  }
}

export const cacheService = new CacheService();
