import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';
import { createTempDir, cleanupTempDir } from '../../helpers/temp-dir.js';
import { MigrationRunner } from '../../../src/commands/upgrade/migrations/runner.js';
import { migration20 } from '../../../src/commands/upgrade/migrations/v2.0.js';
import { migration21 } from '../../../src/commands/upgrade/migrations/v2.1.js';

describe('MigrationRunner full integration', () => {
  let projectDir: string;
  let templateDir: string;

  beforeEach(async () => {
    projectDir = createTempDir('bf-runner-project-');
    templateDir = createTempDir('bf-runner-template-');

    // Set up template source
    const templateContext = path.join(templateDir, '.buildforce', 'context');
    await fs.ensureDir(path.join(templateContext, 'architecture'));
    await fs.ensureDir(path.join(templateContext, 'conventions'));
    await fs.ensureDir(path.join(templateContext, 'verification'));

    await fs.writeFile(path.join(templateContext, 'architecture', '_schema.yaml'), 'type: structural\n');
    await fs.writeFile(path.join(templateContext, 'architecture', '_index.yaml'), 'version: "2.0"\n\ncontexts: []\n');
    await fs.writeFile(path.join(templateContext, 'conventions', '_schema.yaml'), 'type: convention\n');
    await fs.writeFile(path.join(templateContext, 'conventions', '_index.yaml'), 'version: "2.0"\n\ncontexts: []\n');
    await fs.writeFile(path.join(templateContext, 'verification', '_schema.yaml'), 'type: verification\n');
    await fs.writeFile(path.join(templateContext, 'verification', '_index.yaml'), 'version: "2.0"\n\ncontexts: []\n');
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

  it('runs v1.0 -> v2.0 -> v2.1 migration path', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(
      path.join(contextPath, '_index.yaml'),
      'version: "1.0"\n\ncontexts:\n  - id: api\n    file: api.yaml\n    type: component\n'
    );
    await fs.writeFile(
      path.join(contextPath, 'api.yaml'),
      'id: api\ntype: component\nlast_updated: "2024-01-01"\ndescription: API\n'
    );

    const runner = new MigrationRunner();
    runner.register(migration20);
    runner.register(migration21);

    const result = await runner.run(projectDir, templateDir);

    expect(result.migrated).toBe(true);
    expect(result.appliedMigrations).toContain('2.0');
    // v2.0 copies the latest template _index.yaml (v2.1), so v2.1 migration
    // sees the project already at v2.1 and skips. This is correct behavior —
    // the template source always contains the latest version.
    expect(result.toVersion).toBe('2.1');

    // Final state: v2.1 index
    const finalIndex = YAML.parse(await fs.readFile(path.join(contextPath, '_index.yaml'), 'utf8'));
    expect(finalIndex.version).toBe('2.1');
  });

  it('handles already-migrated project', async () => {
    const contextPath = path.join(projectDir, '.buildforce', 'context');
    await fs.ensureDir(contextPath);
    await fs.writeFile(path.join(contextPath, '_index.yaml'), 'version: "2.1"\n');

    const runner = new MigrationRunner();
    runner.register(migration20);
    runner.register(migration21);

    const result = await runner.run(projectDir, templateDir);

    expect(result.alreadyLatest).toBe(true);
    expect(result.migrated).toBe(false);
  });

  it('handles project with no context folder', async () => {
    const runner = new MigrationRunner();
    runner.register(migration20);
    runner.register(migration21);

    const result = await runner.run(projectDir, templateDir);
    // v2.0 skips, v2.1 skips because no _index.yaml
    expect(result.migrated).toBe(false);
  });
});
