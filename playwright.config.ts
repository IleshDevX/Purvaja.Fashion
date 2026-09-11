import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 4174);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('E2E_PORT must be an unprivileged TCP port.');
const origin = `http://localhost:${port}`;
const apiWorkload = /representative catalog workload/;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  use: {
    baseURL: origin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // API latency is independent of the rendering engine. Run it once in a
    // dedicated project so browser UI workloads cannot distort the sample.
    { name: 'api', testMatch: /phase9-performance\.spec\.ts/, grep: apiWorkload },
    { name: 'chromium', grepInvert: apiWorkload, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', grepInvert: apiWorkload, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', grepInvert: apiWorkload, use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @ecommerce/prototype-b-backend start',
      url: `${origin}/readyz`,
      reuseExistingServer: false,
      timeout: 60_000,
      // Exercise the actual release topology and an isolated process, never the
      // developer's API server. Build the frontend with VITE_API_URL=/api/v1.
      env: { ...process.env, NODE_ENV: 'test', PORT: String(port), FRONTEND_URL: origin, CORS_ORIGIN: origin },
    },
  ],
});
