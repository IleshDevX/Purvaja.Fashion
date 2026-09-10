import { afterEach, expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({ isReady:true, isOpen:true, on:vi.fn(), connect:vi.fn(), set:vi.fn(), del:vi.fn(), disconnect:vi.fn(), destroy:vi.fn() }));
vi.mock('redis', () => ({ createClient: () => client }));
vi.mock('../../src/config/env.js', () => ({ env:{ RATE_LIMIT_REDIS_URL:'redis://fixture.invalid', NODE_ENV:'test' } }));
vi.mock('../../src/utils/logger.js', () => ({ logger:{error:vi.fn()} }));
import { MetricsAggregationService } from '../../src/services/metrics-aggregation.service.js';

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
it('handles a scheduled rejection and successfully retries on the next interval', async () => {
  vi.useFakeTimers();
  client.set.mockResolvedValueOnce('OK').mockRejectedValueOnce(new Error('socket closed')).mockResolvedValue('OK');
  client.del.mockResolvedValue(1); client.disconnect.mockResolvedValue(undefined);
  const publisher = new MetricsAggregationService();
  await publisher.start();
  await vi.advanceTimersByTimeAsync(15_000);
  await vi.advanceTimersByTimeAsync(15_000);
  expect(client.set).toHaveBeenCalledTimes(3);
  await publisher.stop();
  await vi.advanceTimersByTimeAsync(30_000);
  expect(client.set).toHaveBeenCalledTimes(3);
});
it('coalesces overlapping publication requests', async () => {
  let finish!: () => void;
  client.set.mockImplementation(() => new Promise<void>(resolve => { finish=resolve; }));
  const publisher = new MetricsAggregationService();
  const first=publisher.publish(); const second=publisher.publish();
  expect(client.set).toHaveBeenCalledOnce();
  finish(); await Promise.all([first,second]);
});
it('settles an outstanding publication during shutdown and prevents new sends', async () => {
  let fail!: (error:Error) => void;
  client.set.mockImplementation(() => new Promise<void>((_resolve,reject) => { fail=reject; }));
  client.destroy.mockImplementation(() => { client.isOpen=false; fail(new Error('shutdown')); });
  const publisher=new MetricsAggregationService();
  const pending=publisher.publish().catch(() => undefined);
  await publisher.stop(); await pending;
  await publisher.publish();
  expect(client.destroy).toHaveBeenCalledOnce();
  expect(client.set).toHaveBeenCalledOnce();
  client.isOpen=true;
});
