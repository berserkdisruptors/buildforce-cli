import { describe, it, expect } from 'vitest';
import { getDefaultConfig, createConfigContent } from '../../../src/utils/config.js';

describe('getDefaultConfig', () => {
  it('returns object with framework: buildforce', () => {
    const config = getDefaultConfig();
    expect(config).toEqual({ framework: 'buildforce' });
  });

  it('returns a new object each call', () => {
    const a = getDefaultConfig();
    const b = getDefaultConfig();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe('createConfigContent', () => {
  it('returns JSON with default config when no args', () => {
    const content = createConfigContent();
    const parsed = JSON.parse(content);
    expect(parsed).toEqual({ framework: 'buildforce' });
  });

  it('includes aiAssistants when provided', () => {
    const content = createConfigContent(['claude', 'cursor']);
    const parsed = JSON.parse(content);
    expect(parsed.aiAssistants).toEqual(['claude', 'cursor']);
  });

  it('includes version when provided', () => {
    const content = createConfigContent(undefined, '1.0.0');
    const parsed = JSON.parse(content);
    expect(parsed.version).toBe('1.0.0');
  });

  it('includes both aiAssistants and version', () => {
    const content = createConfigContent(['claude'], '2.0.0');
    const parsed = JSON.parse(content);
    expect(parsed.aiAssistants).toEqual(['claude']);
    expect(parsed.version).toBe('2.0.0');
    expect(parsed.framework).toBe('buildforce');
  });

  it('produces formatted JSON with trailing newline', () => {
    const content = createConfigContent();
    expect(content).toMatch(/\n$/);
    // Indented with 2 spaces (JSON.stringify(x, null, 2))
    expect(content).toContain('  "framework"');
  });

  it('does not include aiAssistants key when undefined', () => {
    const content = createConfigContent();
    expect(content).not.toContain('aiAssistants');
  });

  it('does not include version key when undefined', () => {
    const content = createConfigContent();
    expect(content).not.toContain('version');
  });
});
