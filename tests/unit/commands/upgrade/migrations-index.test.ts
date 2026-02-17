import { describe, it, expect } from 'vitest';
import { compareVersions, getTodayDate } from '../../../../src/commands/upgrade/migrations/index.js';

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.0', '1.0')).toBe(0);
  });

  it('returns -1 when a < b (major)', () => {
    expect(compareVersions('1.0', '2.0')).toBe(-1);
  });

  it('returns 1 when a > b (major)', () => {
    expect(compareVersions('2.0', '1.0')).toBe(1);
  });

  it('returns -1 when a < b (minor)', () => {
    expect(compareVersions('2.0', '2.1')).toBe(-1);
  });

  it('returns 1 when a > b (minor)', () => {
    expect(compareVersions('2.1', '2.0')).toBe(1);
  });

  it('handles three-part versions', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('treats missing parts as 0', () => {
    expect(compareVersions('1', '1.0')).toBe(0);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1', '1.0.0')).toBe(0);
  });

  it('compares versions with different lengths', () => {
    expect(compareVersions('1', '2.0')).toBe(-1);
    expect(compareVersions('2.0.1', '2')).toBe(1);
  });

  it('handles large version numbers', () => {
    expect(compareVersions('10.0', '9.0')).toBe(1);
    expect(compareVersions('1.10', '1.9')).toBe(1);
  });
});

describe('getTodayDate', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = getTodayDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns today\'s date', () => {
    const result = getTodayDate();
    const expected = new Date().toISOString().split('T')[0];
    expect(result).toBe(expected);
  });
});
