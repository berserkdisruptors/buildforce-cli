#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { initCommand } from "./commands/init/index.js";
import { upgradeCommand } from "./commands/upgrade/index.js";
import { checkCommand } from "./commands/check.js";
import { examplesCommand } from "./commands/examples.js";
import { sessionCommand } from "./commands/session/index.js";
import { generateBanner } from "./lib/interactive.js";
import { MINT_COLOR, TAGLINE } from "./constants.js";
import { createBox } from "./utils/box.js";

const program = new Command();

program
  .name("buildforce")
  .usage("[command] [options]")
  .description(TAGLINE)
  .version("1.0.0")
  .enablePositionalOptions();

// --- Custom help formatting -------------------------------------------------
// Green color for option/argument/command terms
const mint = MINT_COLOR;

// Put banner above Commander help (usage, options, commands)
// Pass function reference so it's called when help is displayed (not at module load)
const renderBannerForHelp = () => {
  return generateBanner();
};
program.addHelpText("beforeAll", renderBannerForHelp);

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

function formatKeyValueRows(
  rows: Array<{ term: string; desc: string }>,
  termWidth: number,
  helpWidth: number
): string[] {
  const pad = 1;
  // Smaller box width - max 70 chars for content (excluding borders)
  const boxMaxWidth = 70;
  const innerMax = Math.min(boxMaxWidth, Math.max(20, helpWidth - 2));
  const gutter = 2;
  // Allocate more width to descriptions - about 25% to terms, 75% to descriptions
  const clampedTermWidth = Math.min(
    termWidth,
    Math.max(8, Math.floor(innerMax * 0.25))
  );
  const firstLineDescWidth = Math.max(
    20,
    innerMax - pad * 2 - clampedTermWidth - gutter
  );
  // Full width for continuation lines (minus padding)
  const fullDescWidth = innerMax - pad * 2;

  const lines: string[] = [];
  rows.forEach(({ term, desc }, index) => {
    // First line: term + description start (respecting word boundaries)
    const firstLineWrapped = hardWrap(desc, firstLineDescWidth);
    const firstLineDesc = firstLineWrapped[0] || "";
    const remainingDesc =
      firstLineWrapped.length > 1 ? firstLineWrapped.slice(1).join(" ") : "";

    // First line: term + description start
    const firstLine = `${term.padEnd(clampedTermWidth)}${" ".repeat(
      gutter
    )}${chalk.hex("#B8B8B8")(firstLineDesc)}`;
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
    const name =
      (argument as any).name?.() ?? (argument as any).displayName ?? "<arg>";
    return mint(name);
  },
  subcommandTerm(cmd) {
    return mint(cmd.name());
  },
  formatHelp(cmd, helper) {
    const termWidth = helper.longestOptionTermLength(cmd, helper);
    const helpWidth = helper.helpWidth ?? (process.stdout.columns || 80);
    const wrap = (str: string) =>
      helper.wrap(str, helpWidth - termWidth - 4, termWidth + 4);

    const lines: string[] = [];

    // Usage - box it like other sections
    const usageText = helper.commandUsage(cmd);
    const boxMaxWidth = 70;
    const fixedInner = Math.min(boxMaxWidth, Math.max(20, helpWidth - 2));
    lines.push(
      "\n" + createBox(usageText, { title: "Usage", width: fixedInner })
    );

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
      lines.push(
        "\n" + createBox(cmdLines, { title: "Commands", width: fixedInner })
      );
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
      lines.push(
        "\n" + createBox(optLines, { title: "Options", width: fixedInner })
      );
    }

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
      lines.push(
        "\n" + createBox(argLines, { title: "Arguments", width: fixedInner })
      );
    }

    return lines.join("\n") + "\n";
  },
});

// Init command
program
  .command("init", { isDefault: true })
  .description("Initialize Buildforce and slash commands")
  .argument(
    "[project-name]",
    'Name for your new project directory (optional if using --here, or use "." for current directory)'
  )
  .option(
    "--ai <assistant...>",
    "AI assistant(s) to use (can specify multiple): claude, gemini, copilot, cursor, qwen, opencode, codex, windsurf, kilocode, auggie, or roo"
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

program
  .command("upgrade")
  .description(
    "Upgrade project templates, commands, and scripts to the latest version"
  )
  .option(
    "--ai <assistant...>",
    "Override or add AI assistant(s) (can specify multiple): claude, gemini, copilot, cursor, qwen, opencode, codex, windsurf, kilocode, auggie, roo"
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
  .description("View workflow examples interactively")
  .action(async () => {
    await examplesCommand();
  });

program
  .command("session")
  .description("Interactively switch between active development sessions")
  .action(async () => {
    await sessionCommand();
  });

program.parse(process.argv);
