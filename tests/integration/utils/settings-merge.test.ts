import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { createTempDir, cleanupTempDir } from '../../helpers/temp-dir.js';
import { mergeAgentSettings } from '../../../src/utils/settings-merge.js';

describe('mergeAgentSettings (integration)', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempDir('bf-settings-');
  });

  afterEach(() => {
    cleanupTempDir(projectDir);
  });

  describe('Claude settings', () => {
    it('creates new settings.local.json when none exists', async () => {
      const result = await mergeAgentSettings(projectDir, '.claude/');
      expect(result.merged).toBe(true);
      expect(result.reason).toBe('created new');

      const settingsPath = path.join(projectDir, '.claude', 'settings.local.json');
      expect(await fs.pathExists(settingsPath)).toBe(true);

      const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
      expect(settings.hooks).toBeDefined();
      expect(settings.hooks.PreToolUse).toBeDefined();
    });

    it('merges with existing settings', async () => {
      const claudeDir = path.join(projectDir, '.claude');
      await fs.ensureDir(claudeDir);
      await fs.writeFile(
        path.join(claudeDir, 'settings.local.json'),
        JSON.stringify({ permissions: { allow: ['Read'] } })
      );

      const result = await mergeAgentSettings(projectDir, '.claude/');
      expect(result.merged).toBe(true);
      expect(result.reason).toBe('merged with existing');

      const settings = JSON.parse(await fs.readFile(path.join(claudeDir, 'settings.local.json'), 'utf8'));
      expect(settings.permissions.allow).toEqual(['Read']);
      expect(settings.hooks.PreToolUse).toBeDefined();
    });

    it('is idempotent', async () => {
      await mergeAgentSettings(projectDir, '.claude/');
      const first = await fs.readFile(path.join(projectDir, '.claude', 'settings.local.json'), 'utf8');

      await mergeAgentSettings(projectDir, '.claude/');
      const second = await fs.readFile(path.join(projectDir, '.claude', 'settings.local.json'), 'utf8');

      expect(JSON.parse(first)).toEqual(JSON.parse(second));
    });
  });

  describe('Cursor settings', () => {
    it('creates new hooks.json', async () => {
      const result = await mergeAgentSettings(projectDir, '.cursor/');
      expect(result.merged).toBe(true);

      const hooksPath = path.join(projectDir, '.cursor', 'hooks.json');
      const hooks = JSON.parse(await fs.readFile(hooksPath, 'utf8'));
      expect(hooks.hooks.preToolUse).toBeDefined();
    });
  });

  describe('OpenCode settings', () => {
    it('creates plugin file', async () => {
      const result = await mergeAgentSettings(projectDir, '.opencode/');
      expect(result.merged).toBe(true);

      const pluginPath = path.join(projectDir, '.opencode', 'plugins', 'buildforce-explorer-redirect.ts');
      expect(await fs.pathExists(pluginPath)).toBe(true);

      const content = await fs.readFile(pluginPath, 'utf8');
      expect(content).toContain('buildforce-explorer');
    });
  });

  describe('Unknown agent', () => {
    it('returns skipped for unknown agent folder', async () => {
      const result = await mergeAgentSettings(projectDir, '.unknown/');
      expect(result.skipped).toBe(true);
      expect(result.merged).toBe(false);
    });
  });
});
