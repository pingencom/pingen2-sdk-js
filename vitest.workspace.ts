import { configDefaults, defineWorkspace } from 'vitest/config';

// Two named projects share vitest.config.ts. `unit` is the mocked suite that gates CI and
// coverage; `integration` talks to the real Pingen staging API, so it gets long timeouts (the
// suite waits for deliveries to leave the `validating` state) and runs its files sequentially.
export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['tests/**/*.test.ts'],
      exclude: [...configDefaults.exclude, 'tests/integration/**'],
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'integration',
      include: ['tests/integration/**/*.integration.test.ts'],
      testTimeout: 180_000,
      hookTimeout: 60_000,
      fileParallelism: false,
    },
  },
]);
