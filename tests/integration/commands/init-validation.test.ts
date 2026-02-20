import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { createTempDir, cleanupTempDir } from '../../helpers/temp-dir.js';
import { validateProjectSetup, validateAiAssistant } from '../../../src/commands/init/validation.js';

const AI_CHOICES = { claude: 'Claude Code', cursor: 'Cursor', opencode: 'OpenCode' };

describe('validateProjectSetup (integration)', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = createTempDir('bf-init-val-');
    originalCwd = process.cwd();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupTempDir(tempDir);
  });

  it('resolves project name to absolute path', async () => {
    const nonExistentProject = path.join(tempDir, 'my-new-project');
    const result = await validateProjectSetup('my-new-project');
    expect(result.projectName).toBe('my-new-project');
    expect(path.isAbsolute(result.projectPath)).toBe(true);
  });

  it('exits when project directory already exists', async () => {
    const existingDir = path.join(tempDir, 'existing');
    await fs.ensureDir(existingDir);

    await expect(
      validateProjectSetup(existingDir)
    ).rejects.toThrow('process.exit(1)');
  });

  it('uses --here to initialize in current directory', async () => {
    process.chdir(tempDir);
    const result = await validateProjectSetup(undefined, true);
    expect(result.isHere).toBe(true);
    expect(result.projectPath).toBe(tempDir);
  });

  it('handles "." as current directory shorthand', async () => {
    process.chdir(tempDir);
    const result = await validateProjectSetup('.');
    expect(result.isHere).toBe(true);
    expect(result.projectPath).toBe(tempDir);
  });

  it('exits when both project name and --here are provided', async () => {
    await expect(
      validateProjectSetup('project', true)
    ).rejects.toThrow('process.exit(1)');
  });

  it('exits when neither project name nor --here provided', async () => {
    await expect(
      validateProjectSetup(undefined, false)
    ).rejects.toThrow('process.exit(1)');
  });

  it('warns and continues with --force when .buildforce exists', async () => {
    process.chdir(tempDir);
    await fs.ensureDir(path.join(tempDir, '.buildforce'));

    const result = await validateProjectSetup(undefined, true, true);
    expect(result.isHere).toBe(true);
    expect(result.projectPath).toBe(tempDir);
  });
});

describe('validateAiAssistant', () => {
  it('does not throw for valid AI choice', () => {
    expect(() => validateAiAssistant('claude', AI_CHOICES)).not.toThrow();
  });

  it('exits for invalid AI choice', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => validateAiAssistant('invalid', AI_CHOICES)).toThrow('process.exit(1)');
  });
});
