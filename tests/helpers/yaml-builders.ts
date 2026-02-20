/**
 * YAML fixture factories for migration tests.
 */

/**
 * Create a v1.0 _index.yaml content string.
 */
export function createV1IndexYaml(entries: Array<{
  id: string;
  file: string;
  type?: string;
  description?: string;
  tags?: string[];
}> = []): string {
  const lines: string[] = ['version: "1.0"', '', 'contexts:'];
  for (const entry of entries) {
    lines.push(`  - id: ${entry.id}`);
    lines.push(`    file: ${entry.file}`);
    if (entry.type) lines.push(`    type: ${entry.type}`);
    if (entry.description) lines.push(`    description: "${entry.description}"`);
    if (entry.tags) lines.push(`    tags: [${entry.tags.join(', ')}]`);
  }
  return lines.join('\n') + '\n';
}

/**
 * Create a v2.0 _index.yaml content string.
 */
export function createV2IndexYaml(): string {
  return `version: "2.0"\n\ncontext_types:\n  - architecture\n  - conventions\n  - verification\n`;
}

/**
 * Create a _guidelines.yaml content string.
 */
export function createGuidelinesYaml(sections: Record<string, Array<{
  pattern?: string;
  convention?: string;
  description?: string;
  enforcement?: string;
}>> = {}): string {
  const lines: string[] = ['version: "1.0"'];
  for (const [section, items] of Object.entries(sections)) {
    lines.push(`${section}:`);
    for (const item of items) {
      if (item.pattern) {
        lines.push(`  - pattern: "${item.pattern}"`);
      } else if (item.convention) {
        lines.push(`  - convention: "${item.convention}"`);
      }
      if (item.description) lines.push(`    description: "${item.description}"`);
      if (item.enforcement) lines.push(`    enforcement: ${item.enforcement}`);
    }
  }
  return lines.join('\n') + '\n';
}

/**
 * Create a v2.0 domain _index.yaml (architecture, conventions, or verification).
 */
export function createDomainIndexYaml(entries: Array<{
  id: string;
  file: string;
  type?: string;
  sub_type?: string;
  enforcement?: string;
  description?: string;
}> = []): string {
  const lines: string[] = ['version: "2.0"', '', 'contexts:'];
  for (const entry of entries) {
    lines.push(`  - id: ${entry.id}`);
    lines.push(`    file: ${entry.file}`);
    if (entry.type) lines.push(`    type: ${entry.type}`);
    if (entry.sub_type) lines.push(`    sub_type: ${entry.sub_type}`);
    if (entry.enforcement) lines.push(`    enforcement: ${entry.enforcement}`);
    if (entry.description) lines.push(`    description: "${entry.description}"`);
  }
  return lines.join('\n') + '\n';
}
