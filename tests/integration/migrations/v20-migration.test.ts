import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';
import { createTempDir, cleanupTempDir } from '../../helpers/temp-dir.js';
import { migration20 } from '../../../src/commands/upgrade/migrations/v2.0.js';

describe('v2.0 migration (integration)', () => {
  let projectDir: string;
  let templateDir: string;

  beforeEach(async () => {
    projectDir = createTempDir('bf-v20-project-');
    templateDir = createTempDir('bf-v20-template-');

    // Set up template source with schema files
    const templateContext = path.join(templateDir, '.buildforce', 'context');
    await fs.ensureDir(path.join(templateContext, 'architecture'));
    await fs.ensureDir(path.join(templateContext, 'conventions'));
    await fs.ensureDir(path.join(templateContext, 'verification'));

    await fs.writeFile(
      path.join(templateContext, 'architecture', '_schema.yaml'),
      'type: structural\n'
    );
    await fs.writeFile(
      path.join(templateContext, 'architecture', '_index.yaml'),
      'version: "2.0"\n\ncontexts: []\n'
    );
    await fs.writeFile(
      path.join(templateContext, 'conventions', '_schema.yaml'),
      'type: convention\n'
    );
    await fs.writeFile(
      path.join(templateContext, 'conventions', '_index.yaml'),
      'version: "2.0"\n\ncontexts: []\n'
    );
    await fs.writeFile(
      path.join(templateContext, 'verification', '_schema.yaml'),
      'type: verification\n'
    );
    await fs.writeFile(
      path.join(templateContext, 'verification', '_index.yaml'),
      'version: "2.0"\n\ncontexts: []\n'
    );
    await fs.writeFile(
      path.join(templateContext, '_index.yaml'),
      'version: "2.0"\n\ncontext_types:\n  - architecture\n  - conventions\n  - verification\n'
    );
  });

  afterEach(() => {
    cleanupTempDir(projectDir);
    cleanupTempDir(templateDir);
  });

  it('skips when no context folder exists', async () => {
    const result = await migration20.execute(projectDir, templateDir);
    expect(result.skipped).toBe(true);
    expect(result.migrated).toBe(false);
  });

  it('skips when already at v2.0', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(
      path.join(contextPath, '_index.yaml'),
      'version: "2.0"\n'
    );

    const result = await migration20.execute(projectDir, templateDir);
    expect(result.skipped).toBe(true);
  });

  it('skips when already at v2.1', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(
      path.join(contextPath, '_index.yaml'),
      'version: "2.1"\n'
    );

    const result = await migration20.execute(projectDir, templateDir);
    expect(result.skipped).toBe(true);
  });

  it('creates architecture, conventions, verification folders', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(
      path.join(contextPath, '_index.yaml'),
      'version: "1.0"\n\ncontexts: []\n'
    );

    const result = await migration20.execute(projectDir, templateDir);
    expect(result.migrated).toBe(true);
    expect(await fs.pathExists(path.join(contextPath, 'architecture'))).toBe(true);
    expect(await fs.pathExists(path.join(contextPath, 'conventions'))).toBe(true);
    expect(await fs.pathExists(path.join(contextPath, 'verification'))).toBe(true);
  });

  it('copies schema files from template', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(
      path.join(contextPath, '_index.yaml'),
      'version: "1.0"\n\ncontexts: []\n'
    );

    await migration20.execute(projectDir, templateDir);

    expect(await fs.pathExists(path.join(contextPath, 'architecture', '_schema.yaml'))).toBe(true);
    expect(await fs.pathExists(path.join(contextPath, 'conventions', '_schema.yaml'))).toBe(true);
    expect(await fs.pathExists(path.join(contextPath, 'verification', '_schema.yaml'))).toBe(true);
  });

  it('migrates _guidelines.yaml into convention files', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(
      path.join(contextPath, '_index.yaml'),
      'version: "1.0"\n\ncontexts: []\n'
    );
    await fs.writeFile(
      path.join(contextPath, '_guidelines.yaml'),
      YAML.stringify({
        version: '1.0',
        code_conventions: [
          {
            convention: 'Use async/await',
            description: 'Always use async/await over callbacks',
            enforcement: 'strict',
          },
        ],
      })
    );

    const result = await migration20.execute(projectDir, templateDir);
    expect(result.migrated).toBe(true);

    // Convention file should exist
    const convFile = path.join(contextPath, 'conventions', 'use-asyncawait.yaml');
    expect(await fs.pathExists(convFile)).toBe(true);

    // Guidelines file should be deleted
    expect(await fs.pathExists(path.join(contextPath, '_guidelines.yaml'))).toBe(false);
  });

  it('moves context files to architecture folder', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(
      path.join(contextPath, '_index.yaml'),
      'version: "1.0"\n\ncontexts:\n  - id: api\n    file: api.yaml\n    type: component\n'
    );
    await fs.writeFile(
      path.join(contextPath, 'api.yaml'),
      'id: api\ntype: component\nlast_updated: "2024-01-01"\ndescription: API structure\n'
    );

    const result = await migration20.execute(projectDir, templateDir);
    expect(result.migrated).toBe(true);

    // Original file should be moved
    expect(await fs.pathExists(path.join(contextPath, 'api.yaml'))).toBe(false);
    expect(await fs.pathExists(path.join(contextPath, 'architecture', 'api.yaml'))).toBe(true);

    // Type should be updated to structural
    const content = await fs.readFile(path.join(contextPath, 'architecture', 'api.yaml'), 'utf8');
    expect(content).toContain('type: structural');
  });

  it('updates root _index.yaml to v2.0 format', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(
      path.join(contextPath, '_index.yaml'),
      'version: "1.0"\n\ncontexts: []\n'
    );

    await migration20.execute(projectDir, templateDir);

    const indexContent = await fs.readFile(path.join(contextPath, '_index.yaml'), 'utf8');
    expect(indexContent).toContain('version: "2.0"');
  });

  it('removes old _schema.yaml from root', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(path.join(contextPath, '_index.yaml'), 'version: "1.0"\n\ncontexts: []\n');
    await fs.writeFile(path.join(contextPath, '_schema.yaml'), 'old schema\n');

    await migration20.execute(projectDir, templateDir);

    expect(await fs.pathExists(path.join(contextPath, '_schema.yaml'))).toBe(false);
  });

  it('removes empty _graph.yaml placeholder', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(path.join(contextPath, '_index.yaml'), 'version: "1.0"\n\ncontexts: []\n');
    await fs.writeFile(path.join(contextPath, '_graph.yaml'), 'graph: []\n');

    await migration20.execute(projectDir, templateDir);

    expect(await fs.pathExists(path.join(contextPath, '_graph.yaml'))).toBe(false);
  });

  it('is idempotent - skips if structure already exists', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(path.join(contextPath, '_index.yaml'), 'version: "1.0"\n\ncontexts: []\n');

    // First run
    const result1 = await migration20.execute(projectDir, templateDir);
    expect(result1.migrated).toBe(true);

    // Second run - should skip because version is now 2.0
    const result2 = await migration20.execute(projectDir, templateDir);
    expect(result2.skipped).toBe(true);
  });
});
