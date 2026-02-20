import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isGitRepo } from '../../../src/utils/git.js';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Mock fs.statSync
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    statSync: vi.fn().mockReturnValue({ isDirectory: () => true }),
  };
});

import { execSync } from 'child_process';
import { statSync } from 'fs';

describe('isGitRepo', () => {
  beforeEach(() => {
    vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(execSync).mockReturnValue(Buffer.from('true'));
  });

  it('returns true for a git repository', () => {
    expect(isGitRepo('/some/path')).toBe(true);
  });

  it('returns false when git command fails', () => {
    vi.mocked(execSync).mockImplementation(() => { throw new Error('not a repo'); });
    expect(isGitRepo('/some/path')).toBe(false);
  });

  it('returns false when path is not a directory', () => {
    vi.mocked(statSync).mockReturnValue({ isDirectory: () => false } as any);
    expect(isGitRepo('/some/file.txt')).toBe(false);
  });

  it('returns false when path does not exist', () => {
    vi.mocked(statSync).mockImplementation(() => { throw new Error('ENOENT'); });
    expect(isGitRepo('/nonexistent')).toBe(false);
  });

  it('uses process.cwd() when no path provided', () => {
    isGitRepo();
    expect(execSync).toHaveBeenCalledWith(
      'git rev-parse --is-inside-work-tree',
      expect.objectContaining({ cwd: process.cwd() })
    );
  });

  it('uses provided path as cwd', () => {
    isGitRepo('/my/project');
    expect(execSync).toHaveBeenCalledWith(
      'git rev-parse --is-inside-work-tree',
      expect.objectContaining({ cwd: '/my/project' })
    );
  });
});
