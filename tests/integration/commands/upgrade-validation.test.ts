import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { createTempDir, cleanupTempDir } from '../../helpers/temp-dir.js';
import { validateUpgradePrerequisites } from '../../../src/commands/upgrade/validation.js';

describe('validateUpgradePrerequisites (integration)', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempDir('bf-upgrade-val-');
  });

  afterEach(() => {
    cleanupTempDir(projectDir);
  });

  it('fails when .buildforce directory does not exist', () => {
    const result = validateUpgradePrerequisites(projectDir);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('.buildforce/ directory not found');
    expect(result.suggestion).toContain('buildforce init');
  });

  it('fails when buildforce.json does not exist', async () => {
    await fs.ensureDir(path.join(projectDir, '.buildforce'));

    const result = validateUpgradePrerequisites(projectDir);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('buildforce.json not found');
  });

  it('fails when buildforce.json is invalid JSON', async () => {
    await fs.ensureDir(path.join(projectDir, '.buildforce'));
    await fs.writeFile(
      path.join(projectDir, '.buildforce', 'buildforce.json'),
      '{invalid json'
    );

    const result = validateUpgradePrerequisites(projectDir);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not valid JSON');
  });

  it('succeeds with valid project structure', async () => {
    await fs.ensureDir(path.join(projectDir, '.buildforce'));
    await fs.writeFile(
      path.join(projectDir, '.buildforce', 'buildforce.json'),
      JSON.stringify({ framework: 'buildforce', version: '2.0' })
    );

    const result = validateUpgradePrerequisites(projectDir);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('succeeds with minimal valid JSON', async () => {
    await fs.ensureDir(path.join(projectDir, '.buildforce'));
    await fs.writeFile(
      path.join(projectDir, '.buildforce', 'buildforce.json'),
      '{}'
    );

    const result = validateUpgradePrerequisites(projectDir);
    expect(result.valid).toBe(true);
  });
});
