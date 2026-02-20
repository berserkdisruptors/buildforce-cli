import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkTool } from '../../../src/utils/tools.js';

// Mock 'which'
vi.mock('which', () => ({
  default: {
    sync: vi.fn(),
  },
}));

// Mock 'fs' for existsSync and statSync
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    statSync: vi.fn(),
  };
});

import which from 'which';
import { existsSync, statSync } from 'fs';

describe('checkTool', () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(which.sync).mockImplementation(() => { throw new Error('not found'); });
  });

  it('returns true when tool is in PATH', () => {
    vi.mocked(which.sync).mockReturnValue('/usr/bin/git');
    expect(checkTool('git')).toBe(true);
  });

  it('returns false when tool is not in PATH', () => {
    expect(checkTool('nonexistent')).toBe(false);
  });

  it('checks Claude local path for claude tool', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(statSync).mockReturnValue({ isFile: () => true } as any);
    expect(checkTool('claude')).toBe(true);
  });

  it('falls through to which for claude when local path does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(which.sync).mockReturnValue('/usr/bin/claude');
    expect(checkTool('claude')).toBe(true);
  });

  it('does not check Claude local path for non-claude tools', () => {
    // Reset existsSync call count before this specific test
    vi.mocked(existsSync).mockClear();
    vi.mocked(which.sync).mockReturnValue('/usr/bin/git');
    expect(checkTool('git')).toBe(true);
    // existsSync should not be called for non-claude tools
    expect(existsSync).not.toHaveBeenCalled();
  });

  it('returns false for claude when both local path and which fail', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(checkTool('claude')).toBe(false);
  });

  it('falls through when local claude path exists but is not a file', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(statSync).mockReturnValue({ isFile: () => false } as any);
    // which also fails
    expect(checkTool('claude')).toBe(false);
  });
});
