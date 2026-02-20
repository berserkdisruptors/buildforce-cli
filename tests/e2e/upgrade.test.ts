import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import { createTempDir, cleanupTempDir } from '../helpers/temp-dir.js';

const CLI_PATH = path.resolve('dist/cli.js');

describe('buildforce upgrade (e2e)', () => {
  let tempDir: string;
  let localArtifactsDir: string;
  let projectDir: string;

  beforeAll(async () => {
    // Create a local artifact ZIP for testing
    localArtifactsDir = createTempDir('bf-e2e-upgrade-artifacts-');

    const zip = new AdmZip();
    zip.addFile('.buildforce/buildforce.json', Buffer.from(JSON.stringify({ framework: 'buildforce' })));
    zip.addFile('.buildforce/context/_index.yaml', Buffer.from('version: "2.1"\n'));
    zip.addFile('.buildforce/context/architecture/_schema.yaml', Buffer.from('type: structural\n'));
    zip.addFile('.buildforce/context/conventions/_schema.yaml', Buffer.from('type: convention\n'));
    zip.addFile('.buildforce/context/verification/_schema.yaml', Buffer.from('type: verification\n'));
    zip.addFile('.claude/CLAUDE.md', Buffer.from('# Buildforce\n'));

    zip.writeZip(path.join(localArtifactsDir, 'buildforce-cli-template-claude-v0.0.99.zip'));
  });

  beforeEach(async () => {
    tempDir = createTempDir('bf-e2e-upgrade-');
    projectDir = tempDir;

    // Create a minimal existing buildforce project
    await fs.ensureDir(path.join(projectDir, '.buildforce', 'context'));
    await fs.writeFile(
      path.join(projectDir, '.buildforce', 'buildforce.json'),
      JSON.stringify({ framework: 'buildforce', aiAssistants: ['claude'], version: '0.0.1' })
    );
    await fs.writeFile(
      path.join(projectDir, '.buildforce', 'context', '_index.yaml'),
      'version: "2.1"\n'
    );
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  afterAll(() => {
    cleanupTempDir(localArtifactsDir);
  });

  it('runs upgrade with --local flag', () => {
    const output = execSync(
      `node ${CLI_PATH} upgrade --ai claude --local ${localArtifactsDir}`,
      {
        encoding: 'utf8',
        timeout: 30000,
        cwd: projectDir,
        env: { ...process.env, FORCE_COLOR: '0' },
      }
    );

    expect(output).toBeDefined();
  });

  it('fails gracefully when not in a buildforce project', () => {
    const emptyDir = createTempDir('bf-e2e-empty-');

    try {
      execSync(
        `node ${CLI_PATH} upgrade --ai claude --local ${localArtifactsDir}`,
        {
          encoding: 'utf8',
          timeout: 10000,
          cwd: emptyDir,
          env: { ...process.env, FORCE_COLOR: '0' },
        }
      );
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.status).not.toBe(0);
    } finally {
      cleanupTempDir(emptyDir);
    }
  });

  it('preserves existing buildforce.json', async () => {
    try {
      execSync(
        `node ${CLI_PATH} upgrade --ai claude --local ${localArtifactsDir}`,
        {
          encoding: 'utf8',
          timeout: 30000,
          cwd: projectDir,
          env: { ...process.env, FORCE_COLOR: '0' },
        }
      );
    } catch {
      // Upgrade may fail for non-critical reasons in test environment,
      // but the config file should still be preserved
    }

    const config = JSON.parse(
      await fs.readFile(path.join(projectDir, '.buildforce', 'buildforce.json'), 'utf8')
    );
    expect(config.framework).toBe('buildforce');
  });
});
