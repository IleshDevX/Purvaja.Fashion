import { createClient } from 'redis';
import type { Store } from 'express-rate-limit';
import { env } from '../config/env.js';

// Separate from the optional cache: quota failures must never fail open.
const client = createClient({
  url: env.RATE_LIMIT_REDIS_URL,
  disableOfflineQueue: true,
  socket: { connectTimeout: 2000, reconnectStrategy: false },
});
client.on('error', () => { /* Requests fail closed while unavailable. */ });
let connecting: Promise<unknown> | undefined;

async function redis() {
  if (!client.isReady) {
    connecting ??= client.connect().finally(() => { connecting = undefined; });
    await connecting;
  }
  return client.withAbortSignal(AbortSignal.timeout(2000));
}

export async function disconnectRateLimitStore(): Promise<void> {
  if (client.isOpen) await client.disconnect();
}

export class SharedRateLimitStore implements Store {
  localKeys = false;
  readonly prefix: string;
  constructor(namespace: string, private readonly windowMs: number) {
    this.prefix = `purvaja:rate-limit:${namespace}:`;
  }
  async increment(key: string) {
    const connection = await redis();
    const result = await connection.eval(
      `local hits = redis.call('INCR', KEYS[1])
       if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
       return {hits, redis.call('PTTL', KEYS[1])}`,
      { keys: [this.prefix + key], arguments: [String(this.windowMs)] },
    ) as number[];
    return { totalHits: result[0]!, resetTime: new Date(Date.now() + result[1]!) };
  }
  async decrement(key: string) {
    await (await redis()).eval(
      "if tonumber(redis.call('GET', KEYS[1]) or '0') > 0 then redis.call('DECR', KEYS[1]) end",
      { keys: [this.prefix + key], arguments: [] },
    );
  }
  async resetKey(key: string) { await (await redis()).del(this.prefix + key); }
}
