import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';
import { createTempDir, cleanupTempDir } from '../../helpers/temp-dir.js';
import { migration21 } from '../../../src/commands/upgrade/migrations/v2.1.js';

describe('v2.1 migration (integration)', () => {
  let projectDir: string;
  let templateDir: string;

  beforeEach(async () => {
    projectDir = createTempDir('bf-v21-project-');
    templateDir = createTempDir('bf-v21-template-');

    // Set up template with v2.1 _index.yaml
    const templateContext = path.join(templateDir, '.buildforce', 'context');
    await fs.ensureDir(templateContext);
    await fs.writeFile(
      path.join(templateContext, '_index.yaml'),
      `# Buildforce Context Coverage Map
version: "2.1"
generated_at: null
last_updated: null

codebase_profile:
  languages: []
  frameworks: []
  project_type: null
  scale: null

domains:
  architecture:
    description: "Structural context."
    schema: "architecture/_schema.yaml"
    coverage: 0
    average_depth: "none"
    items: []
  conventions:
    description: "Convention context."
    schema: "conventions/_schema.yaml"
    coverage: 0
    average_depth: "none"
    items: []
  verification:
    description: "Verification context."
    schema: "verification/_schema.yaml"
    coverage: 0
    average_depth: "none"
    items: []

summary:
  overall_coverage: 0
  total_items: 0
  extracted_items: 0
  iterations_completed: 0

extraction:
  needs_clarification: []
  recommended_focus: []
  new_discoveries: []
`
    );
  });

  afterEach(() => {
    cleanupTempDir(projectDir);
    cleanupTempDir(templateDir);
  });

  it('skips when no context folder exists', async () => {
    const result = await migration21.execute(projectDir, templateDir);
    expect(result.skipped).toBe(true);
  });

  it('skips when no root _index.yaml exists', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);

    const result = await migration21.execute(projectDir, templateDir);
    expect(result.skipped).toBe(true);
  });

  it('skips when already at v2.1', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(path.join(contextPath, '_index.yaml'), 'version: "2.1"\n');

    const result = await migration21.execute(projectDir, templateDir);
    expect(result.skipped).toBe(true);
  });

  it('skips when project looks like v1.0', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(
      path.join(contextPath, '_index.yaml'),
      'contexts:\n  - id: test\n    file: test.yaml\n'
    );

    const result = await migration21.execute(projectDir, templateDir);
    expect(result.skipped).toBe(true);
  });

  it('migrates v2.0 to v2.1 with domain indexes', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(path.join(contextPath, 'architecture'));
    await fs.ensureDir(path.join(contextPath, 'conventions'));
    await fs.ensureDir(path.join(contextPath, 'verification'));

    // Root _index.yaml at v2.0
    await fs.writeFile(
      path.join(contextPath, '_index.yaml'),
      'version: "2.0"\n\ncontext_types:\n  - architecture\n  - conventions\n  - verification\n'
    );

    // Architecture domain index with entries
    await fs.writeFile(
      path.join(contextPath, 'architecture', '_index.yaml'),
      YAML.stringify({
        version: '2.0',
        contexts: [
          { id: 'api', file: 'api.yaml', type: 'structural', description: 'API structure' },
        ],
      })
    );

    // Conventions domain index with entries
    await fs.writeFile(
      path.join(contextPath, 'conventions', '_index.yaml'),
      YAML.stringify({
        version: '2.0',
        contexts: [
          { id: 'naming', file: 'naming.yaml', sub_type: 'naming-convention', description: 'Naming rules' },
        ],
      })
    );

    // Empty verification
    await fs.writeFile(
      path.join(contextPath, 'verification', '_index.yaml'),
      'version: "2.0"\n\ncontexts: []\n'
    );

    const result = await migration21.execute(projectDir, templateDir);
    expect(result.migrated).toBe(true);

    // Root _index.yaml should be updated to v2.1
    const indexContent = await fs.readFile(path.join(contextPath, '_index.yaml'), 'utf8');
    const index = YAML.parse(indexContent);
    expect(index.version).toBe('2.1');

    // Domain indexes should be deleted
    expect(await fs.pathExists(path.join(contextPath, 'architecture', '_index.yaml'))).toBe(false);
    expect(await fs.pathExists(path.join(contextPath, 'conventions', '_index.yaml'))).toBe(false);
    expect(await fs.pathExists(path.join(contextPath, 'verification', '_index.yaml'))).toBe(false);

    // Entries should be in domains.*.items
    expect(index.domains.architecture.items).toHaveLength(1);
    expect(index.domains.architecture.items[0].id).toBe('api');
    expect(index.domains.conventions.items).toHaveLength(1);
    expect(index.domains.conventions.items[0].id).toBe('naming');
  });

  it('handles v2.0 with no domain index files', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);

    await fs.writeFile(
      path.join(contextPath, '_index.yaml'),
      'version: "2.0"\n\ncontext_types:\n  - architecture\n'
    );

    const result = await migration21.execute(projectDir, templateDir);
    expect(result.migrated).toBe(true);

    const indexContent = await fs.readFile(path.join(contextPath, '_index.yaml'), 'utf8');
    const index = YAML.parse(indexContent);
    expect(index.version).toBe('2.1');
  });

  it('preserves comments from template', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);

    await fs.writeFile(
      path.join(contextPath, '_index.yaml'),
      'version: "2.0"\n\ncontext_types:\n  - architecture\n'
    );

    await migration21.execute(projectDir, templateDir);

    const indexContent = await fs.readFile(path.join(contextPath, '_index.yaml'), 'utf8');
    expect(indexContent).toContain('Buildforce Context Coverage Map');
  });
});
