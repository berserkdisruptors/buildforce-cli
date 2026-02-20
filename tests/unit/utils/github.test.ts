import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getGithubToken, getGithubAuthHeaders } from '../../../src/utils/github.js';

describe('getGithubToken', () => {
  let originalGhToken: string | undefined;
  let originalGithubToken: string | undefined;

  beforeEach(() => {
    originalGhToken = process.env.GH_TOKEN;
    originalGithubToken = process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    if (originalGhToken !== undefined) {
      process.env.GH_TOKEN = originalGhToken;
    } else {
      delete process.env.GH_TOKEN;
    }
    if (originalGithubToken !== undefined) {
      process.env.GITHUB_TOKEN = originalGithubToken;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
  });

  it('returns CLI token when provided', () => {
    expect(getGithubToken('cli-token')).toBe('cli-token');
  });

  it('returns GH_TOKEN env var when no CLI token', () => {
    process.env.GH_TOKEN = 'gh-token';
    expect(getGithubToken()).toBe('gh-token');
  });

  it('returns GITHUB_TOKEN env var when no CLI token or GH_TOKEN', () => {
    process.env.GITHUB_TOKEN = 'github-token';
    expect(getGithubToken()).toBe('github-token');
  });

  it('prefers CLI token over env vars', () => {
    process.env.GH_TOKEN = 'gh-token';
    process.env.GITHUB_TOKEN = 'github-token';
    expect(getGithubToken('cli-token')).toBe('cli-token');
  });

  it('prefers GH_TOKEN over GITHUB_TOKEN', () => {
    process.env.GH_TOKEN = 'gh-token';
    process.env.GITHUB_TOKEN = 'github-token';
    expect(getGithubToken()).toBe('gh-token');
  });

  it('returns undefined when no token available', () => {
    expect(getGithubToken()).toBeUndefined();
  });

  it('returns undefined for empty string CLI token', () => {
    expect(getGithubToken('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only CLI token', () => {
    expect(getGithubToken('   ')).toBeUndefined();
  });

  it('trims the returned token', () => {
    expect(getGithubToken('  token  ')).toBe('token');
  });
});

describe('getGithubAuthHeaders', () => {
  let originalGhToken: string | undefined;
  let originalGithubToken: string | undefined;

  beforeEach(() => {
    originalGhToken = process.env.GH_TOKEN;
    originalGithubToken = process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    if (originalGhToken !== undefined) {
      process.env.GH_TOKEN = originalGhToken;
    } else {
      delete process.env.GH_TOKEN;
    }
    if (originalGithubToken !== undefined) {
      process.env.GITHUB_TOKEN = originalGithubToken;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
  });

  it('includes Accept and API version headers', () => {
    const headers = getGithubAuthHeaders();
    expect(headers.Accept).toBe('application/vnd.github+json');
    expect(headers['X-GitHub-Api-Version']).toBe('2022-11-28');
  });

  it('includes Authorization header when token exists', () => {
    const headers = getGithubAuthHeaders('my-token');
    expect(headers.Authorization).toBe('Bearer my-token');
  });

  it('omits Authorization header when no token', () => {
    const headers = getGithubAuthHeaders();
    expect(headers).not.toHaveProperty('Authorization');
  });
});
