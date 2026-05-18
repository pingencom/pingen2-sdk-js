import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      // Exclude pure type/interface modules — v8 coverage counts them as 0% because they emit
      // no runtime code, but they have no branches/statements to cover anyway.
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/**/types.ts',
        'src/**/response.ts',
        'src/**/enums/**',
        'src/common/json-api.ts',
        'src/common/typed-response.ts',
        'src/common/relationships.ts',
        'src/common/webhook-event.ts',
      ],
      thresholds: {
        statements: 95,
        functions: 95,
        lines: 95,
        branches: 95,
      },
    },
  },
});
