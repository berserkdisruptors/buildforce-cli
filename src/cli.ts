#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { initCommand } from "./commands/init/index.js";
import { upgradeCommand } from "./commands/upgrade/index.js";
import { checkCommand } from "./commands/check.js";
import { examplesCommand } from "./commands/examples.js";
import { showBanner, generateBanner } from "./lib/interactive.js";
import { MINT_COLOR } from "./constants.js";

const program = new Command();

program
  .alias("bf")
  .description("Context-first Spec-Driven Development framework")
  .version("1.0.0")
  .enablePositionalOptions();

// --- Custom help formatting -------------------------------------------------
// Mint color for option/argument/command terms
const mint = MINT_COLOR;

// Put banner above Commander help (usage, options, commands)
const renderBannerForHelp = () => {
  return generateBanner();
};
program.addHelpText("beforeAll", renderBannerForHelp());

function boxedHeader(title: string): string {
  const text = ` ${title} `;
  const width = text.length;
  const top = `┌${"─".repeat(width)}┐`;
  const mid = `│${text}│`;
  const bot = `└${"─".repeat(width)}┘`;
  return [chalk.gray(top), chalk.bold.white(mid), chalk.gray(bot)].join("\n");
}

function hardWrap(text: string, width: number): string[] {
  if (text.length <= width) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current ? current.length + 1 : 0) + w.length > width) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = current ? current + " " + w : w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function boxSection(
  title: string,
  contentLines: string[],
  helpWidth?: number,
  fixedInnerWidth?: number,
): string {
  const pad = 1;
  const titlePlain = title.replace(/\u001b\[[0-9;]*m/g, "");
  const maxAllowedInner = helpWidth ? Math.max(10, helpWidth - 2) : Infinity;

  // Ensure each line fits within the inner width (account for padding later)
  const normalized: string[] = [];
  for (const l of contentLines) {
    const raw = l.replace(/\u001b\[[0-9;]*m/g, "");
    const innerWidth = Math.min(maxAllowedInner - pad * 2, raw.length);
    const wrapped = helpWidth ? hardWrap(l, Math.max(10, innerWidth)) : [l];
    normalized.push(...wrapped);
  }

  const computed = Math.max(
    titlePlain.length + pad * 2,
    ...normalized.map((l) => l.replace(/\u001b\[[0-9;]*m/g, "").length + pad * 2),
  );
  const maxLine = Math.min(maxAllowedInner, fixedInnerWidth ?? computed);
  const top = `┌${"─".repeat(maxLine)}┐`;
  const sep = `├${"─".repeat(maxLine)}┤`;
  const bot = `└${"─".repeat(maxLine)}┘`;

  const titleLine = `│${" ".repeat(pad)}${chalk.bold.white(title)}${" ".repeat(
    maxLine - pad - titlePlain.length,
  )}│`;

  const body = normalized.map((l) => {
    const rawLen = l.replace(/\u001b\[[0-9;]*m/g, "").length;
    const spaces = Math.max(0, maxLine - pad - rawLen);
    return `│${" ".repeat(pad)}${l}${" ".repeat(spaces)}│`;
  });

  return [chalk.gray(top), titleLine, chalk.gray(sep), ...body.map((b) => b), chalk.gray(bot)].join(
    "\n",
  );
}

function formatKeyValueRows(
  rows: Array<{ term: string; desc: string }>,
  termWidth: number,
  helpWidth: number,
): string[] {
  const pad = 1; // same pad as boxSection
  // Smaller box width - max 70 chars for content (excluding borders)
  const boxMaxWidth = 70;
  const innerMax = Math.min(boxMaxWidth, Math.max(20, helpWidth - 2));
  const gutter = 2;
  // Allocate more width to descriptions - about 25% to terms, 75% to descriptions
  const clampedTermWidth = Math.min(termWidth, Math.max(8, Math.floor(innerMax * 0.25)));
  const firstLineDescWidth = Math.max(20, innerMax - pad * 2 - clampedTermWidth - gutter);
  // Full width for continuation lines (minus padding)
  const fullDescWidth = innerMax - pad * 2;

  const lines: string[] = [];
  rows.forEach(({ term, desc }, index) => {
    // First line: term + description start (respecting word boundaries)
    const firstLineWrapped = hardWrap(desc, firstLineDescWidth);
    const firstLineDesc = firstLineWrapped[0] || "";
    const remainingDesc = firstLineWrapped.length > 1 
      ? firstLineWrapped.slice(1).join(" ") 
      : "";
    
    // First line: term + description start
    const firstLine = `${term.padEnd(clampedTermWidth)}${" ".repeat(gutter)}${chalk.hex("#B8B8B8")(firstLineDesc)}`;
    lines.push(firstLine);
    
    // Remaining description uses full width
    if (remainingDesc) {
      const wrapped = hardWrap(remainingDesc, fullDescWidth);
      wrapped.forEach((line) => {
        lines.push(chalk.hex("#B8B8B8")(line));
      });
    }
    
    // add spacing between entries (but not after the last one)
    if (index !== rows.length - 1) {
      lines.push("");
    }
  });
  return lines;
}

program.configureHelp({
  optionTerm(option) {
    return mint(option.flags);
  },
  argumentTerm(argument) {
    // argument.name() may be undefined in some commander versions; fallback to displayName
    const name = (argument as any).name?.() ?? (argument as any).displayName ?? "<arg>";
    return mint(name);
  },
  subcommandTerm(cmd) {
    return mint(cmd.name());
  },
  formatHelp(cmd, helper) {
    const termWidth = helper.longestOptionTermLength(cmd, helper);
    const helpWidth = helper.helpWidth ?? (process.stdout.columns || 80);
    const wrap = (str: string) => helper.wrap(str, helpWidth - termWidth - 4, termWidth + 4);

    const lines: string[] = [];

    // Usage - box it like other sections
    const usageText = helper.commandUsage(cmd);
    const boxMaxWidth = 70;
    const fixedInner = Math.min(boxMaxWidth, Math.max(20, helpWidth - 2));
    lines.push("\n" + boxSection("Usage", [usageText], helpWidth, fixedInner));

    // Arguments
    const argumentsList = helper.visibleArguments(cmd);
    if (argumentsList.length) {
      const rows = argumentsList.map((arg) => ({
        term: helper.argumentTerm(arg),
        desc: helper.argumentDescription(arg),
      }));
      const argLines = formatKeyValueRows(rows, termWidth, helpWidth);
      // Smaller box width - max 70 chars for content
      const boxMaxWidth = 70;
      const fixedInner = Math.min(boxMaxWidth, Math.max(20, helpWidth - 2));
      lines.push("\n" + boxSection("Arguments", argLines, helpWidth, fixedInner));
    }

    // Options
    const options = helper.visibleOptions(cmd);
    if (options.length) {
      const rows = options.map((opt) => ({
        term: helper.optionTerm(opt),
        desc: helper.optionDescription(opt),
      }));
      const optLines = formatKeyValueRows(rows, termWidth, helpWidth);
      // Smaller box width - max 70 chars for content
      const boxMaxWidth = 70;
      const fixedInner = Math.min(boxMaxWidth, Math.max(20, helpWidth - 2));
      lines.push("\n" + boxSection("Options", optLines, helpWidth, fixedInner));
    }

    // Commands
    const subcommands = helper.visibleCommands(cmd);
    if (subcommands.length) {
      const rows = subcommands.map((c) => ({
        term: helper.subcommandTerm(c),
        desc: helper.subcommandDescription(c),
      }));
      const cmdLines = formatKeyValueRows(rows, termWidth, helpWidth);
      // Smaller box width - max 70 chars for content
      const boxMaxWidth = 70;
      const fixedInner = Math.min(boxMaxWidth, Math.max(20, helpWidth - 2));
      lines.push("\n" + boxSection("Commands", cmdLines, helpWidth, fixedInner));
    }

    return lines.join("\n") + "\n";
  },
});

program
  .command("upgrade")
  .description(
    "Upgrade project templates, commands, and scripts to the latest version"
  )
  .option(
    "--ai <assistant>",
    "Override AI assistant (claude, gemini, copilot, cursor, qwen, opencode, codex, windsurf, kilocode, auggie, roo)"
  )
  .option("--script <type>", "Override script type (sh or ps)")
  .option("--dry-run", "Preview changes without applying them")
  .option("--debug", "Show verbose diagnostic output")
  .option("--github-token <token>", "GitHub token for API requests")
  .option("--skip-tls", "Skip SSL/TLS verification (not recommended)")
  .option(
    "--local [path]",
    "Use local artifacts from directory instead of GitHub (default: .genreleases)"
  )
  .action(async (options) => {
    await upgradeCommand({
      ai: options.ai,
      script: options.script,
      dryRun: options.dryRun,
      debug: options.debug,
      githubToken: options.githubToken,
      skipTls: options.skipTls,
      local: options.local,
    });
  });

program
  .command("check")
  .description("Check that all required tools are installed")
  .action(() => {
    checkCommand();
  });

program
  .command("examples")
  .description("View workflow examples")
  .action(async () => {
    await examplesCommand();
  });

// We no longer append banner after help; it's injected before via addHelpText

// Default behavior (init) - defined AFTER subcommands
program
  .argument(
    "[project-name]",
    'Name for your new project directory (optional if using --here, or use "." for current directory)'
  )
  .option(
    "--ai <assistant>",
    "AI assistant to use: claude, gemini, copilot, cursor, qwen, opencode, codex, windsurf, kilocode, auggie, or roo"
  )
  .option("--script <type>", "Script type to use: sh or ps")
  .option(
    "--ignore-agent-tools",
    "Skip checks for AI agent tools like Claude Code"
  )
  .option("--no-git", "Skip git repository initialization")
  .option(
    "--here",
    "Initialize project in the current directory instead of creating a new one"
  )
  .option(
    "--force",
    "Force merge/overwrite when using --here (skip confirmation)"
  )
  .option("--skip-tls", "Skip SSL/TLS verification (not recommended)")
  .option(
    "--debug",
    "Show verbose diagnostic output for network and extraction failures"
  )
  .option(
    "--github-token <token>",
    "GitHub token to use for API requests (or set GH_TOKEN or GITHUB_TOKEN environment variable)"
  )
  .option(
    "--local [path]",
    "Use local artifacts from directory instead of GitHub (default: .genreleases)\n" +
    "Example: buildforce init my-project --local --ai claude --script sh"
  )
  .action(async (projectName, options) => {
    // If no project name and no flags, show help
    if (!projectName && !options.here && Object.keys(options).length === 0) {
      // Banner is already registered via program.addHelpText("beforeAll", renderBannerForHelp())
      // so program.help() will display it automatically
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
      local: options.local,
    });
  });

program.parse(process.argv);
