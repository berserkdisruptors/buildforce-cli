#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init/index.js';
import { checkCommand } from './commands/check.js';
import { showBanner } from './lib/interactive.js';
import { BANNER, TAGLINE } from './constants.js';

const program = new Command();

program
  .name('buildforce')
  .description('BuildForce - Spec-Driven Development toolkit')
  .version('1.0.0');

// Main command (buildforce [project-name]) - equivalent to init
program
  .argument('[project-name]', 'Name for your new project directory (optional if using --here, or use "." for current directory)')
  .option('--ai <assistant>', 'AI assistant to use: claude, gemini, copilot, cursor, qwen, opencode, codex, windsurf, kilocode, auggie, or roo')
  .option('--script <type>', 'Script type to use: sh or ps')
  .option('--ignore-agent-tools', 'Skip checks for AI agent tools like Claude Code')
  .option('--no-git', 'Skip git repository initialization')
  .option('--here', 'Initialize project in the current directory instead of creating a new one')
  .option('--force', 'Force merge/overwrite when using --here (skip confirmation)')
  .option('--skip-tls', 'Skip SSL/TLS verification (not recommended)')
  .option('--debug', 'Show verbose diagnostic output for network and extraction failures')
  .option('--github-token <token>', 'GitHub token to use for API requests (or set GH_TOKEN or GITHUB_TOKEN environment variable)')
  .action(async (projectName, options) => {
    // If no project name and no flags, show help
    if (!projectName && !options.here && Object.keys(options).length === 0) {
      showBanner(BANNER, TAGLINE);
      program.help();
      return;
    }

    await initCommand({
      projectName,
      aiAssistant: options.ai,
      scriptType: options.script,
      ignoreAgentTools: options.ignoreAgentTools,
      noGit: !options.git,
      here: options.here,
      force: options.force,
      skipTls: options.skipTls,
      debug: options.debug,
      githubToken: options.githubToken,
    });
  });

program
  .command('buildforce-check')
  .description('Check that all required tools are installed')
  .action(() => {
    checkCommand();
  });

// Custom help with banner
program.on('--help', () => {
  showBanner(BANNER, TAGLINE);
});

program.parse(process.argv);
