import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // The integration suite shares one hosted PostgreSQL pool; serial files avoid exhausting it.
    fileParallelism: false,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', 'tests/**', 'src/generated/**', 'src/seeds/**', 'src/docs/**', 'prisma/**', '**/*.d.ts'],
    },
  },
});
