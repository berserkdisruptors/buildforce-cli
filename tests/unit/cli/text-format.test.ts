import { describe, it, expect } from 'vitest';
import { hardWrap, formatKeyValueRows } from '../../../src/utils/text-format.js';

describe('hardWrap', () => {
  it('returns single-element array for short text', () => {
    expect(hardWrap('hello', 80)).toEqual(['hello']);
  });

  it('wraps at word boundary', () => {
    const result = hardWrap('hello world foo bar', 12);
    expect(result.length).toBeGreaterThan(1);
    result.forEach(line => {
      expect(line.length).toBeLessThanOrEqual(12);
    });
  });

  it('handles empty string', () => {
    expect(hardWrap('', 80)).toEqual(['']);
  });

  it('handles single long word', () => {
    // A single word longer than the width should still be output as-is
    const result = hardWrap('superlongword', 5);
    expect(result).toEqual(['superlongword']);
  });

  it('preserves all words', () => {
    const text = 'the quick brown fox jumps over the lazy dog';
    const result = hardWrap(text, 15);
    const joined = result.join(' ');
    expect(joined).toBe(text);
  });

  it('handles text exactly at width', () => {
    expect(hardWrap('exact', 5)).toEqual(['exact']);
  });

  it('wraps at correct boundaries', () => {
    const result = hardWrap('one two three four five', 10);
    expect(result[0]).toBe('one two');
    expect(result[1]).toBe('three four');
    expect(result[2]).toBe('five');
  });
});

describe('formatKeyValueRows', () => {
  it('formats single row', () => {
    const rows = [{ term: 'init', desc: 'Initialize project' }];
    const result = formatKeyValueRows(rows, 10, 80);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toContain('init');
  });

  it('formats multiple rows with spacing', () => {
    const rows = [
      { term: 'init', desc: 'Initialize project' },
      { term: 'upgrade', desc: 'Upgrade project' },
    ];
    const result = formatKeyValueRows(rows, 10, 80);
    // Should have a blank line between entries
    expect(result.some(line => line === '')).toBe(true);
  });

  it('does not add trailing blank line', () => {
    const rows = [
      { term: 'init', desc: 'Initialize' },
      { term: 'check', desc: 'Check tools' },
    ];
    const result = formatKeyValueRows(rows, 10, 80);
    expect(result[result.length - 1]).not.toBe('');
  });

  it('handles long descriptions with wrapping', () => {
    const rows = [{
      term: 'cmd',
      desc: 'This is a very long description that should wrap across multiple lines when the width is narrow',
    }];
    const result = formatKeyValueRows(rows, 10, 40);
    expect(result.length).toBeGreaterThan(1);
  });
});
