import { vi, beforeEach } from 'vitest';

// Global mock for process.exit() — throws instead of terminating the test runner.
// Tests that expect process.exit can catch this known error.
const originalExit = process.exit;

beforeEach(() => {
  vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
    throw new Error(`process.exit(${code ?? 0})`);
  });
});
