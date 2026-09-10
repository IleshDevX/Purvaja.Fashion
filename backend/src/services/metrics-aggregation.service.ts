import { randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { metrics, type MetricsSnapshot } from '../utils/metrics.js';

export interface AggregatedMetrics {
  scope: 'process' | 'shared';
  workerCount: number;
  snapshot: MetricsSnapshot;
}

interface NumericTree { [key: string]: number | NumericTree }

function sumTree(target: NumericTree, source: NumericTree): void {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'number') target[key] = (typeof target[key] === 'number' ? target[key] : 0) + value;
    else {
      const nested = typeof target[key] === 'object' ? target[key] as NumericTree : {};
      target[key] = nested;
      sumTree(nested, value);
    }
  }
}

export function aggregateMetricSnapshots(snapshots: MetricsSnapshot[]): MetricsSnapshot {
  if (snapshots.length === 0) return metrics.getSnapshot();
  const result = structuredClone(snapshots[0]!);
  const routeTotals = new Map<string, { count: number; errors: number; totalMs: number }>();
  const latestFailure = snapshots.map(s => s.database.lastFailureAt).filter((v): v is string => Boolean(v)).sort().at(-1) ?? null;

  result.uptimeSeconds = Math.max(...snapshots.map(s => s.uptimeSeconds));
  result.http.totalRequests = 0;
  result.http.status2xx = 0;
  result.http.status3xx = 0;
  result.http.status4xx = 0;
  result.http.status5xx = 0;
  result.http.activeRequests = 0;
  result.http.latency = { count: 0, totalMs: 0, minMs: 0, maxMs: 0, avgMs: 0 };
  result.http.byRoute = {};
  result.database = { queriesExecuted: 0, queryFailures: 0, poolTimeouts: 0, lastFailureAt: latestFailure };
  result.redis = { operations: 0, hits: 0, misses: 0, fallbacks: 0, connectionErrors: 0 };
  const business = structuredClone(result.business) as unknown as NumericTree;
  for (const group of Object.values(business)) {
    if (typeof group !== 'object') continue;
    for (const key of Object.keys(group)) group[key] = 0;
  }
  result.business = business as unknown as MetricsSnapshot['business'];
  result.worker = { totalSweeps: 0, successfulSweeps: 0, failedSweeps: 0, totalReleasedReservations: 0,
    lastRunAt: null, lastCompletedAt: null, lastDurationMs: 0, concurrencySkips: 0 };

  for (const snapshot of snapshots) {
    for (const key of ['totalRequests', 'status2xx', 'status3xx', 'status4xx', 'status5xx', 'activeRequests'] as const) {
      result.http[key] += snapshot.http[key];
    }
    result.http.latency.count += snapshot.http.latency.count;
    result.http.latency.totalMs += snapshot.http.latency.totalMs;
    result.http.latency.maxMs = Math.max(result.http.latency.maxMs, snapshot.http.latency.maxMs);
    if (snapshot.http.latency.count > 0) {
      result.http.latency.minMs = result.http.latency.minMs === 0
        ? snapshot.http.latency.minMs
        : Math.min(result.http.latency.minMs, snapshot.http.latency.minMs);
    }
    for (const [route, data] of Object.entries(snapshot.http.byRoute)) {
      const current = routeTotals.get(route) ?? { count: 0, errors: 0, totalMs: 0 };
      current.count += data.count;
      current.errors += data.errors;
      current.totalMs += data.avgMs * data.count;
      routeTotals.set(route, current);
    }
    result.database.queriesExecuted += snapshot.database.queriesExecuted;
    result.database.queryFailures += snapshot.database.queryFailures;
    result.database.poolTimeouts += snapshot.database.poolTimeouts;
    for (const key of ['operations', 'hits', 'misses', 'fallbacks', 'connectionErrors'] as const) result.redis[key] += snapshot.redis[key];
    sumTree(result.business as unknown as NumericTree, snapshot.business as unknown as NumericTree);
    for (const key of ['totalSweeps', 'successfulSweeps', 'failedSweeps', 'totalReleasedReservations', 'concurrencySkips'] as const) {
      result.worker[key] += snapshot.worker[key];
    }
    result.worker.lastDurationMs = Math.max(result.worker.lastDurationMs, snapshot.worker.lastDurationMs);
    if (snapshot.worker.lastRunAt && (!result.worker.lastRunAt || snapshot.worker.lastRunAt > result.worker.lastRunAt)) result.worker.lastRunAt = snapshot.worker.lastRunAt;
    if (snapshot.worker.lastCompletedAt && (!result.worker.lastCompletedAt || snapshot.worker.lastCompletedAt > result.worker.lastCompletedAt)) result.worker.lastCompletedAt = snapshot.worker.lastCompletedAt;
  }
  result.http.latency.avgMs = result.http.latency.count === 0 ? 0 : Math.round((result.http.latency.totalMs / result.http.latency.count) * 100) / 100;
  const sortedRoutes = [...routeTotals.entries()].sort((a, b) => b[1].count - a[1].count);
  const kept = sortedRoutes.slice(0, 99);
  const overflow = sortedRoutes.slice(99).reduce((sum, [, d]) => ({ count: sum.count + d.count, errors: sum.errors + d.errors, totalMs: sum.totalMs + d.totalMs }), { count: 0, errors: 0, totalMs: 0 });
  if (overflow.count > 0) kept.push(['__other__', overflow]);
  for (const [route, data] of kept) result.http.byRoute[route] = { count: data.count, errors: data.errors, avgMs: Math.round((data.totalMs / data.count) * 100) / 100 };
  result.timestamp = new Date().toISOString();
  return result;
}

export class MetricsAggregationService {
  private readonly instanceId = `${process.pid}-${randomUUID()}`;
  private readonly prefix = 'purvaja:metrics:worker:';
  private readonly client = env.RATE_LIMIT_REDIS_URL ? createClient({
    url: env.RATE_LIMIT_REDIS_URL,
    disableOfflineQueue: true,
    socket: { connectTimeout: 2_000, reconnectStrategy: false },
  }) : undefined;
  private timer?: NodeJS.Timeout;
  private publishing?: Promise<void>;
  private stopping = false;

  constructor() { this.client?.on('error', () => undefined); }

  get isSharedReady(): boolean { return Boolean(this.client?.isReady); }

  async start(): Promise<void> {
    if (!this.client || this.timer) return;
    this.stopping = false;
    try {
      if (!this.client.isReady) await this.client.connect();
      await this.publish();
      this.timer = setInterval(() => {
        void this.publish().catch(error => {
          logger.error({ errorName: error instanceof Error ? error.name : 'UnknownError' }, 'Shared metrics publication failed; next interval will retry.');
        });
      }, 15_000);
      this.timer.unref();
    } catch (error) {
      logger.error({ errorName: error instanceof Error ? error.name : 'UnknownError' }, 'Shared metrics publisher could not connect.');
      if (env.NODE_ENV === 'staging' || env.NODE_ENV === 'production') throw error;
    }
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    // Closing the socket settles any blocked command, so shutdown does not wait
    // forever for optional telemetry. The interval owns its rejection handler.
    if (this.publishing && this.client?.isOpen) this.client.destroy();
    await this.publishing?.catch(() => undefined);
    if (!this.client?.isOpen) return;
    await this.client.del(this.prefix + this.instanceId).catch(() => undefined);
    await this.client.disconnect().catch(() => undefined);
  }

  async publish(): Promise<void> {
    if (this.stopping || !this.client?.isReady) return;
    if (this.publishing) return this.publishing;
    const pending = this.client.set(this.prefix + this.instanceId, JSON.stringify(metrics.getSnapshot()), { EX: 45 }).then(() => undefined);
    this.publishing = pending;
    try { await pending; }
    finally { if (this.publishing === pending) this.publishing = undefined; }
  }

  async getSnapshot(): Promise<AggregatedMetrics> {
    const local = metrics.getSnapshot();
    if (!this.client?.isReady) return { scope: 'process', workerCount: 1, snapshot: local };
    try {
      await this.publish();
      const keys: string[] = [];
      for await (const keyOrKeys of this.client.scanIterator({ MATCH: `${this.prefix}*`, COUNT: 100 })) {
        if (Array.isArray(keyOrKeys)) keys.push(...keyOrKeys);
        else keys.push(keyOrKeys);
      }
      const values = keys.length > 0 ? await this.client.mGet(keys) : [];
      const snapshots = values.flatMap(value => {
        try { return value ? [JSON.parse(value) as MetricsSnapshot] : []; } catch { return []; }
      });
      return snapshots.length > 0
        ? { scope: 'shared', workerCount: snapshots.length, snapshot: aggregateMetricSnapshots(snapshots) }
        : { scope: 'process', workerCount: 1, snapshot: local };
    } catch (error) {
      logger.error({ errorName: error instanceof Error ? error.name : 'UnknownError' }, 'Shared metrics aggregation failed.');
      return { scope: 'process', workerCount: 1, snapshot: local };
    }
  }
}

export const metricsAggregationService = new MetricsAggregationService();
