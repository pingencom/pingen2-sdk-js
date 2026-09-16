import { defineConfig } from 'vitest/config';

// Settings shared by both projects in vitest.workspace.ts — that file owns the per-project test
// globs and timeouts. Coverage is measured on the unit project only (`npm test`).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
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
        statements: 100,
        functions: 100,
        lines: 100,
        branches: 100,
      },
    },
  },
});
