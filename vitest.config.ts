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
      exclude: [
        'src/types.ts',
        'src/types.d.ts',
        'src/constants.ts',
        'src/config/agents.ts',
        'src/scripts/**',
        'src/templates/**',
      ],
      thresholds: {
        statements: 30,
        branches: 25,
        functions: 30,
        lines: 30,
      },
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
