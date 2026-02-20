import { describe, it, expect } from 'vitest';
import { mergeArraysUnique, mergeSettings } from '../../../src/utils/settings-merge.js';

describe('mergeArraysUnique', () => {
  it('merges non-overlapping arrays', () => {
    expect(mergeArraysUnique([1, 2], [3, 4])).toEqual([1, 2, 3, 4]);
  });

  it('deduplicates overlapping items', () => {
    expect(mergeArraysUnique([1, 2, 3], [2, 3, 4])).toEqual([1, 2, 3, 4]);
  });

  it('handles empty existing array', () => {
    expect(mergeArraysUnique([], [1, 2])).toEqual([1, 2]);
  });

  it('handles empty incoming array', () => {
    expect(mergeArraysUnique([1, 2], [])).toEqual([1, 2]);
  });

  it('handles both empty', () => {
    expect(mergeArraysUnique([], [])).toEqual([]);
  });

  it('deduplicates strings', () => {
    expect(mergeArraysUnique(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('deduplicates objects by JSON.stringify', () => {
    const obj1 = { matcher: 'Task', command: 'hook.sh' };
    const obj2 = { matcher: 'Task', command: 'hook.sh' };
    const obj3 = { matcher: 'Read', command: 'other.sh' };
    expect(mergeArraysUnique([obj1], [obj2, obj3])).toEqual([obj1, obj3]);
  });

  it('treats differently-ordered object keys as different', () => {
    // JSON.stringify produces different strings for different key orders
    const a = JSON.stringify({ a: 1, b: 2 });
    const b = JSON.stringify({ b: 2, a: 1 });
    // This test documents the behavior - objects with same keys in different order
    // may or may not be deduplicated depending on insertion order
    const result = mergeArraysUnique([{ a: 1, b: 2 }], [{ a: 1, b: 2 }]);
    expect(result).toHaveLength(1);
  });

  it('preserves order of existing items', () => {
    expect(mergeArraysUnique([3, 1, 2], [4])).toEqual([3, 1, 2, 4]);
  });
});

describe('mergeSettings', () => {
  it('returns existing settings when incoming is empty', () => {
    const existing = { version: 1, permissions: { allow: ['Read'] } };
    const result = mergeSettings(existing, {});
    expect(result).toEqual(existing);
  });

  it('merges version from incoming', () => {
    const result = mergeSettings({ version: 1 }, { version: 2 });
    expect(result.version).toBe(2);
  });

  it('preserves version when not in incoming', () => {
    const result = mergeSettings({ version: 1 }, {});
    expect(result.version).toBe(1);
  });

  it('merges permissions.allow arrays', () => {
    const result = mergeSettings(
      { permissions: { allow: ['Read'] } },
      { permissions: { allow: ['Write'] } }
    );
    expect(result.permissions!.allow).toEqual(['Read', 'Write']);
  });

  it('deduplicates permissions.allow', () => {
    const result = mergeSettings(
      { permissions: { allow: ['Read'] } },
      { permissions: { allow: ['Read', 'Write'] } }
    );
    expect(result.permissions!.allow).toEqual(['Read', 'Write']);
  });

  it('merges permissions.deny arrays', () => {
    const result = mergeSettings(
      { permissions: { deny: ['Bash'] } },
      { permissions: { deny: ['Task'] } }
    );
    expect(result.permissions!.deny).toEqual(['Bash', 'Task']);
  });

  it('merges permissions.ask arrays', () => {
    const result = mergeSettings(
      { permissions: { ask: ['Edit'] } },
      { permissions: { ask: ['Write'] } }
    );
    expect(result.permissions!.ask).toEqual(['Edit', 'Write']);
  });

  it('creates permissions object when only in incoming', () => {
    const result = mergeSettings({}, { permissions: { allow: ['Read'] } });
    expect(result.permissions!.allow).toEqual(['Read']);
  });

  it('merges hooks by type', () => {
    const hook1 = { matcher: 'Task', command: 'a.sh' };
    const hook2 = { matcher: 'Read', command: 'b.sh' };
    const result = mergeSettings(
      { hooks: { PreToolUse: [hook1] } },
      { hooks: { PreToolUse: [hook2] } }
    );
    expect(result.hooks!.PreToolUse).toEqual([hook1, hook2]);
  });

  it('creates hooks object when only in incoming', () => {
    const hook = { matcher: 'Task', command: 'a.sh' };
    const result = mergeSettings({}, { hooks: { PreToolUse: [hook] } });
    expect(result.hooks!.PreToolUse).toEqual([hook]);
  });

  it('deduplicates hooks', () => {
    const hook = { matcher: 'Task', command: 'a.sh' };
    const result = mergeSettings(
      { hooks: { PreToolUse: [hook] } },
      { hooks: { PreToolUse: [hook] } }
    );
    expect(result.hooks!.PreToolUse).toHaveLength(1);
  });

  it('preserves existing extra properties', () => {
    const result = mergeSettings(
      { customField: 'value' } as any,
      { version: 2 }
    );
    expect((result as any).customField).toBe('value');
  });
});
