import { mkdtempSync, rmSync, realpathSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Create a temporary directory for test isolation.
 * Returns the real absolute path (resolves macOS /var -> /private/var symlinks).
 */
export function createTempDir(prefix = 'buildforce-test-'): string {
  return realpathSync(mkdtempSync(join(tmpdir(), prefix)));
}

/**
 * Remove a temporary directory and all its contents.
 */
export function cleanupTempDir(dirPath: string): void {
  try {
    rmSync(dirPath, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup
  }
}
