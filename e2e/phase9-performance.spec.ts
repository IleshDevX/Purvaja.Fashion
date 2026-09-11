import { expect, test } from '@playwright/test';

test('representative catalog workload records bounded latency and correct responses', async ({ request }, testInfo) => {
  const total = 60;
  const concurrency = 10;
  const durations: number[] = [];
  let successes = 0;
  const started = performance.now();

  for (let offset = 0; offset < total; offset += concurrency) {
    await Promise.all(Array.from({ length: Math.min(concurrency, total - offset) }, async (_, index) => {
      const before = performance.now();
      const response = await request.get(`/api/v1/products?page=${(offset + index) % 3 + 1}&limit=12`, {
        headers: {
          'X-Test-Rate-Limit-Max': '50000',
          'X-Test-Client-Id': `phase9-perf-${testInfo.project.name}-${offset}-${index}`,
        },
      });
      durations.push(performance.now() - before);
      if (response.ok()) {
        const body = await response.json() as { success?: boolean; data?: { items?: unknown[] } };
        if (body.success === true && Array.isArray(body.data?.items)) successes++;
      }
    }));
  }

  durations.sort((a, b) => a - b);
  const elapsedMs = performance.now() - started;
  const evidence = {
    environment: 'isolated-local',
    total,
    concurrency,
    successes,
    errors: total - successes,
    throughputRequestsPerSecond: Math.round((total / elapsedMs) * 100_000) / 100,
    p50Ms: Math.round(durations[Math.floor(durations.length * 0.5)]! * 100) / 100,
    p95Ms: Math.round(durations[Math.floor(durations.length * 0.95)]! * 100) / 100,
    maxMs: Math.round(durations.at(-1)! * 100) / 100,
  };
  await testInfo.attach('catalog-api-performance.json', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  process.stdout.write(`PHASE9_API_PERFORMANCE ${JSON.stringify(evidence)}\n`);
  expect(evidence.errors).toBe(0);
  expect(evidence.p95Ms).toBeLessThan(2_000);
});

test('catalog page records local Core Web Vitals without layout instability', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const samples = { cls: 0, lcp: 0 };
    Object.defineProperty(window, '__phase9Vitals', { value: samples, writable: false });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) samples.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) {
        if (!entry.hadRecentInput) samples.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('/shop');
  await expect(page.getByRole('main')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1_000);
  const evidence = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const vitals = (window as typeof window & { __phase9Vitals: { cls: number; lcp: number } }).__phase9Vitals;
    return {
      environment: 'isolated-local',
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd * 100) / 100,
      loadMs: Math.round(navigation.loadEventEnd * 100) / 100,
      lcpMs: Math.round(vitals.lcp * 100) / 100,
      cls: Math.round(vitals.cls * 1000) / 1000,
      resources: performance.getEntriesByType('resource').length,
    };
  });
  await testInfo.attach('catalog-web-vitals.json', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  process.stdout.write(`PHASE9_WEB_VITALS ${JSON.stringify(evidence)}\n`);
  expect(evidence.lcpMs).toBeGreaterThan(0);
  expect(evidence.lcpMs).toBeLessThan(4_000);
  expect(evidence.cls).toBeLessThan(0.25);
});
