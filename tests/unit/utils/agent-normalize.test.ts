import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  convertToolsToMap,
  convertModel,
  substituteBodyPaths,
  normalizeToOpenCode,
  normalizeTemplate,
} from '../../../src/utils/agent-normalize.js';
import { createAgentTemplate } from '../../helpers/fixtures.js';

describe('parseFrontmatter', () => {
  it('parses valid frontmatter', () => {
    const content = '---\nname: test\ndescription: A test\n---\nBody content here.';
    const result = parseFrontmatter(content);
    expect(result).not.toBeNull();
    expect(result!.raw).toBe('name: test\ndescription: A test');
    expect(result!.body).toBe('Body content here.');
  });

  it('returns null for content without frontmatter', () => {
    expect(parseFrontmatter('No frontmatter here')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseFrontmatter('')).toBeNull();
  });

  it('returns null for content with only opening ---', () => {
    expect(parseFrontmatter('---\nname: test')).toBeNull();
  });

  it('handles empty body after frontmatter', () => {
    const content = '---\nname: test\n---\n';
    const result = parseFrontmatter(content);
    expect(result).not.toBeNull();
    expect(result!.raw).toBe('name: test');
    expect(result!.body).toBe('');
  });

  it('handles multiline body', () => {
    const content = '---\nname: test\n---\nLine 1\nLine 2\nLine 3';
    const result = parseFrontmatter(content);
    expect(result!.body).toBe('Line 1\nLine 2\nLine 3');
  });

  it('handles frontmatter with multiple fields', () => {
    const content = '---\nname: test\ndescription: desc\ntools: Read, Glob\nmodel: sonnet\n---\nBody';
    const result = parseFrontmatter(content);
    expect(result!.raw).toContain('name: test');
    expect(result!.raw).toContain('tools: Read, Glob');
    expect(result!.raw).toContain('model: sonnet');
  });
});

describe('convertToolsToMap', () => {
  it('converts comma-separated tools to map', () => {
    const result = convertToolsToMap('Read, Glob, Grep');
    expect(result).toEqual({ read: true, glob: true, grep: true });
  });

  it('handles single tool', () => {
    const result = convertToolsToMap('Bash');
    expect(result).toEqual({ bash: true });
  });

  it('ignores unknown tools', () => {
    const result = convertToolsToMap('Read, UnknownTool, Glob');
    expect(result).toEqual({ read: true, glob: true });
  });

  it('handles all known tools', () => {
    const result = convertToolsToMap('Read, Glob, Grep, Edit, Write, Bash, Task, WebFetch, WebSearch');
    expect(result).toEqual({
      read: true,
      glob: true,
      grep: true,
      edit: true,
      write: true,
      bash: true,
      task: true,
      webfetch: true,
      websearch: true,
    });
  });

  it('handles extra whitespace', () => {
    const result = convertToolsToMap('  Read  ,  Glob  ');
    // The map keys might not include entries since "  Read  " won't match "Read" after .trim()
    // Let me check: raw.trim() is used, so "  Read  ".trim() = "Read" which is in the map
    expect(result).toEqual({ read: true, glob: true });
  });

  it('returns empty map for empty string', () => {
    const result = convertToolsToMap('');
    expect(result).toEqual({});
  });
});

describe('convertModel', () => {
  it('converts sonnet to provider-qualified string', () => {
    expect(convertModel('sonnet')).toBe('anthropic/claude-sonnet-4-5');
  });

  it('converts opus to provider-qualified string', () => {
    expect(convertModel('opus')).toBe('anthropic/claude-opus-4-6');
  });

  it('converts haiku to provider-qualified string', () => {
    expect(convertModel('haiku')).toBe('anthropic/claude-haiku-4-5');
  });

  it('returns undefined for inherit', () => {
    expect(convertModel('inherit')).toBeUndefined();
  });

  it('passes through unknown models unchanged', () => {
    expect(convertModel('gpt-4')).toBe('gpt-4');
  });

  it('trims whitespace', () => {
    expect(convertModel('  sonnet  ')).toBe('anthropic/claude-sonnet-4-5');
  });

  it('passes through empty string', () => {
    expect(convertModel('')).toBe('');
  });
});

describe('substituteBodyPaths', () => {
  it('returns body unchanged for claude agent', () => {
    const body = 'Check .claude/settings.json for config';
    expect(substituteBodyPaths(body, 'claude')).toBe(body);
  });

  it('replaces .claude/ with .cursor/ for cursor agent', () => {
    const body = 'Check .claude/settings.json for config';
    expect(substituteBodyPaths(body, 'cursor')).toBe('Check .cursor/settings.json for config');
  });

  it('replaces .claude/ with .opencode/ for opencode agent', () => {
    const body = 'Check .claude/settings.json for config';
    expect(substituteBodyPaths(body, 'opencode')).toBe('Check .opencode/settings.json for config');
  });

  it('replaces all occurrences in body', () => {
    const body = 'Path: .claude/foo and .claude/bar';
    expect(substituteBodyPaths(body, 'cursor')).toBe('Path: .cursor/foo and .cursor/bar');
  });

  it('returns body unchanged for unknown agent', () => {
    const body = 'Check .claude/settings.json';
    expect(substituteBodyPaths(body, 'unknown')).toBe(body);
  });

  it('handles body with no .claude/ references', () => {
    const body = 'No references here';
    expect(substituteBodyPaths(body, 'cursor')).toBe(body);
  });
});

describe('normalizeToOpenCode', () => {
  it('adds mode: subagent', () => {
    const result = normalizeToOpenCode('description: A test agent');
    expect(result.mode).toBe('subagent');
  });

  it('preserves description', () => {
    const result = normalizeToOpenCode('description: A test agent');
    expect(result.description).toBe('A test agent');
  });

  it('converts tools to map', () => {
    const result = normalizeToOpenCode('tools: Read, Glob, Grep');
    expect(result.tools).toEqual({ read: true, glob: true, grep: true });
  });

  it('converts model to provider-qualified', () => {
    const result = normalizeToOpenCode('model: sonnet');
    expect(result.model).toBe('anthropic/claude-sonnet-4-5');
  });

  it('omits model for inherit', () => {
    const result = normalizeToOpenCode('model: inherit');
    expect(result.model).toBeUndefined();
  });

  it('removes name field', () => {
    const result = normalizeToOpenCode('name: test-agent\ndescription: A test');
    expect(result).not.toHaveProperty('name');
  });

  it('handles empty frontmatter', () => {
    const result = normalizeToOpenCode('');
    expect(result.mode).toBe('subagent');
  });
});

describe('normalizeTemplate', () => {
  it('returns content unchanged for claude', () => {
    const content = createAgentTemplate({
      name: 'test',
      description: 'A test',
      tools: 'Read, Glob',
      model: 'sonnet',
      body: 'Check .claude/settings',
    });
    expect(normalizeTemplate(content, 'claude')).toBe(content);
  });

  it('substitutes paths for cursor', () => {
    const content = createAgentTemplate({
      name: 'test',
      description: 'A test',
      body: 'Check .claude/settings',
    });
    const result = normalizeTemplate(content, 'cursor');
    expect(result).toContain('.cursor/settings');
    expect(result).not.toContain('.claude/settings');
  });

  it('preserves cursor frontmatter unchanged', () => {
    const content = createAgentTemplate({
      name: 'test',
      description: 'A test',
      body: 'Body content',
    });
    const result = normalizeTemplate(content, 'cursor');
    expect(result).toContain('name: test');
  });

  it('normalizes frontmatter for opencode', () => {
    const content = createAgentTemplate({
      name: 'test',
      description: 'A test',
      tools: 'Read, Glob',
      model: 'sonnet',
      body: 'Check .claude/settings',
    });
    const result = normalizeTemplate(content, 'opencode');
    expect(result).toContain('mode: subagent');
    expect(result).toContain('.opencode/settings');
    expect(result).not.toContain('name: test');
  });

  it('returns content unchanged for unknown agent', () => {
    const content = createAgentTemplate({ name: 'test', body: 'Body' });
    expect(normalizeTemplate(content, 'unknown')).toBe(content);
  });

  it('returns content unchanged when no frontmatter', () => {
    const content = 'No frontmatter here';
    expect(normalizeTemplate(content, 'opencode')).toBe(content);
  });
});
