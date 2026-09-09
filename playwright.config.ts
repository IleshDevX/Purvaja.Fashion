import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  use: {
    baseURL: 'http://localhost:4174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @ecommerce/prototype-b-backend start',
      url: 'http://localhost:5001/readyz',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...process.env, NODE_ENV: 'test' },
    },
    {
      command: 'pnpm --filter @ecommerce/prototype-b preview --host 127.0.0.1',
      url: 'http://localhost:4174',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
