import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    // Each jsdom worker loads the app graph; bound memory on local/CI hosts.
    maxWorkers: 2,
    environment: 'jsdom',
    setupFiles: path.resolve(__dirname, './src/test/setup.ts'),
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: { reporter: ['text', 'json-summary'] },
  },
});
