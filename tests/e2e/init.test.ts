import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import { createTempDir, cleanupTempDir } from '../helpers/temp-dir.js';

const CLI_PATH = path.resolve('dist/cli.js');

describe('buildforce init (e2e)', () => {
  let tempDir: string;
  let localArtifactsDir: string;

  beforeAll(async () => {
    // Create a minimal local artifact ZIP for testing
    localArtifactsDir = createTempDir('bf-e2e-artifacts-');

    const zip = new AdmZip();
    // Add minimal .buildforce structure
    zip.addFile('.buildforce/buildforce.json', Buffer.from(JSON.stringify({ framework: 'buildforce' })));
    zip.addFile('.buildforce/context/_index.yaml', Buffer.from('version: "2.1"\n'));
    zip.addFile('.buildforce/context/architecture/_schema.yaml', Buffer.from('type: structural\n'));
    zip.addFile('.buildforce/context/conventions/_schema.yaml', Buffer.from('type: convention\n'));
    zip.addFile('.buildforce/context/verification/_schema.yaml', Buffer.from('type: verification\n'));
    // Add minimal agent files
    zip.addFile('.claude/CLAUDE.md', Buffer.from('# Buildforce\n'));

    zip.writeZip(path.join(localArtifactsDir, 'buildforce-cli-template-claude-v0.0.99.zip'));
  });

  beforeEach(() => {
    tempDir = createTempDir('bf-e2e-init-');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  afterAll(() => {
    cleanupTempDir(localArtifactsDir);
  });

  it('creates a new project with --local and --no-git', () => {
    const projectName = 'test-project';
    const projectPath = path.join(tempDir, projectName);

    execSync(
      `node ${CLI_PATH} init ${projectPath} --ai claude --local ${localArtifactsDir} --no-git`,
      {
        encoding: 'utf8',
        timeout: 30000,
        env: { ...process.env, FORCE_COLOR: '0' },
      }
    );

    // Check that the project was created
    expect(fs.existsSync(projectPath)).toBe(true);
    expect(fs.existsSync(path.join(projectPath, '.buildforce'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, '.buildforce', 'buildforce.json'))).toBe(true);
  });

  it('shows error when called without arguments', () => {
    const output = execSync(`node ${CLI_PATH} init 2>&1 || true`, {
      encoding: 'utf8',
      timeout: 10000,
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    // Should show an error about missing project name
    expect(output).toContain('Must specify');
  });

  it('fails gracefully when project directory already exists', () => {
    const projectPath = path.join(tempDir, 'existing-project');
    fs.ensureDirSync(projectPath);

    try {
      execSync(
        `node ${CLI_PATH} init ${projectPath} --ai claude --local ${localArtifactsDir} --no-git`,
        {
          encoding: 'utf8',
          timeout: 10000,
          env: { ...process.env, FORCE_COLOR: '0' },
        }
      );
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.status).not.toBe(0);
    }
  });
});
