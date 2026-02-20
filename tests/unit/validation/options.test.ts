import { describe, it, expect } from 'vitest';
import {
  validateChoice,
  validateGithubToken,
  validateProjectName,
} from '../../../src/validation/options.js';

describe('validateChoice', () => {
  const choices = { claude: 'Claude Code', cursor: 'Cursor', opencode: 'OpenCode' };

  it('returns true for valid choice', () => {
    expect(validateChoice('claude', choices, 'ai')).toBe(true);
  });

  it('returns true for another valid choice', () => {
    expect(validateChoice('cursor', choices, 'ai')).toBe(true);
  });

  it('returns false for undefined value', () => {
    expect(validateChoice(undefined, choices, 'ai')).toBe(false);
  });

  it('throws for invalid choice', () => {
    expect(() => validateChoice('invalid', choices, 'ai')).toThrow(
      "Invalid ai 'invalid'. Choose from: claude, cursor, opencode"
    );
  });

  it('throws with correct option name', () => {
    expect(() => validateChoice('bad', choices, 'agent')).toThrow("Invalid agent 'bad'");
  });

  it('returns false for empty string', () => {
    expect(validateChoice('' as any, choices, 'ai')).toBe(false);
  });
});

describe('validateGithubToken', () => {
  it('returns true for valid token', () => {
    expect(validateGithubToken('ghp_abc123')).toBe(true);
  });

  it('returns false for undefined', () => {
    expect(validateGithubToken(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(validateGithubToken('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(validateGithubToken('   ')).toBe(false);
  });

  it('returns true for any non-empty trimmed string', () => {
    expect(validateGithubToken('some-token')).toBe(true);
  });
});

describe('validateProjectName', () => {
  it('accepts simple alphanumeric name', () => {
    expect(validateProjectName('myproject')).toBe(true);
  });

  it('accepts name with hyphens', () => {
    expect(validateProjectName('my-project')).toBe(true);
  });

  it('accepts name with underscores', () => {
    expect(validateProjectName('my_project')).toBe(true);
  });

  it('accepts name with dots', () => {
    expect(validateProjectName('my.project')).toBe(true);
  });

  it('accepts mixed valid characters', () => {
    expect(validateProjectName('My-Project_2.0')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(validateProjectName('')).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(validateProjectName('   ')).toBe(false);
  });

  it('rejects name with spaces', () => {
    expect(validateProjectName('my project')).toBe(false);
  });

  it('rejects name with special characters', () => {
    expect(validateProjectName('my@project')).toBe(false);
  });

  it('rejects name with slashes', () => {
    expect(validateProjectName('my/project')).toBe(false);
  });
});
