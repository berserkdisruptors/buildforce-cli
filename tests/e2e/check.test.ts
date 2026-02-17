import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const CLI_PATH = path.resolve('dist/cli.js');

function runCli(args: string): string {
  return execSync(`node ${CLI_PATH} ${args}`, {
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
}

describe('buildforce check (e2e)', () => {
  it('runs without error', () => {
    const output = runCli('check');
    expect(output).toBeDefined();
  });

  it('outputs tool detection results', () => {
    const output = runCli('check');
    expect(output).toContain('Git version control');
  });

  it('shows ready message', () => {
    const output = runCli('check');
    expect(output).toContain('ready to use');
  });
});
