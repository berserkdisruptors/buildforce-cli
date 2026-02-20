/**
 * Shared fixture builders for tests.
 */

/**
 * Create a minimal agent template with frontmatter.
 */
export function createAgentTemplate(opts: {
  name?: string;
  description?: string;
  tools?: string;
  model?: string;
  body?: string;
} = {}): string {
  const lines: string[] = ['---'];
  if (opts.name) lines.push(`name: ${opts.name}`);
  if (opts.description) lines.push(`description: ${opts.description}`);
  if (opts.tools) lines.push(`tools: ${opts.tools}`);
  if (opts.model) lines.push(`model: ${opts.model}`);
  lines.push('---');
  lines.push(opts.body ?? 'Template body content.');
  return lines.join('\n');
}

/**
 * Create a minimal buildforce.json config object.
 */
export function createBuildforceConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    framework: 'buildforce',
    ...overrides,
  };
}
