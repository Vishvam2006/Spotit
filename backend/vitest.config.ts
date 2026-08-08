import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.ts'],
    globalTeardown: ['./tests/global-teardown.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 120000,
  },
});
