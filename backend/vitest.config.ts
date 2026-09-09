import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Integration files share disposable fixtures; avoid cross-file races.
    fileParallelism: false,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', 'tests/**', 'src/generated/**', 'src/seeds/**', 'src/docs/**', 'prisma/**', '**/*.d.ts'],
    },
  },
});
