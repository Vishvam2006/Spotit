import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.ts'],
    globalTeardown: ['./tests/global-teardown.ts'],
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 120000,
  },
});
