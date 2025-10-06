import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import boxen from "boxen";
import inquirer from "inquirer";
import {
  AI_CHOICES,
  SCRIPT_TYPE_CHOICES,
  BANNER,
  TAGLINE,
  AGENT_FOLDER_MAP,
} from "../constants.js";
import { InitOptions } from "../types.js";
import {
  checkTool,
  isGitRepo,
  initGitRepo,
  ensureExecutableScripts,
} from "../utils.js";
import { showBanner, selectWithArrows } from "../interactive.js";
import { downloadAndExtractTemplate } from "../extract.js";
import { StepTracker } from "../step-tracker.js";

/**
 * Initialize a new Buildforce CLI project from the latest template
 */
export async function initCommand(options: InitOptions): Promise<void> {
  // Show banner first
  showBanner(BANNER, TAGLINE);

  const {
    projectName: inputProjectName,
    aiAssistant: inputAiAssistant,
    scriptType: inputScriptType,
    ignoreAgentTools = false,
    noGit = false,
    here = false,
    force = false,
    skipTls = false,
    debug = false,
    githubToken,
  } = options;

  // Handle '.' as shorthand for current directory (equivalent to --here)
  let projectName = inputProjectName;
  let isHere = here;

  if (projectName === ".") {
    isHere = true;
    projectName = undefined;
  }

  // Validate arguments
  if (isHere && projectName) {
    console.error(
      chalk.red("Error:"),
      "Cannot specify both project name and --here flag"
    );
    process.exit(1);
  }

  if (!isHere && !projectName) {
    console.error(
      chalk.red("Error:"),
      "Must specify either a project name, use '.' for current directory, or use --here flag"
    );
    process.exit(1);
  }

  // Determine project directory
  let projectPath: string;
  if (isHere) {
    projectName = path.basename(process.cwd());
    projectPath = process.cwd();

    // Check if current directory has any files
    const existingItems = await fs.readdir(projectPath);
    if (existingItems.length > 0) {
      console.log(
        chalk.yellow("Warning:"),
        `Current directory is not empty (${existingItems.length} items)`
      );
      console.log(
        chalk.yellow(
          "Template files will be merged with existing content and may overwrite existing files"
        )
      );

      if (force) {
        console.log(
          chalk.cyan(
            "--force supplied: skipping confirmation and proceeding with merge"
          )
        );
      } else {
        // Ask for confirmation
        const { confirmed } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmed",
            message: "Do you want to continue?",
            default: false,
          },
        ]);

        if (!confirmed) {
          console.log(chalk.yellow("Operation cancelled"));
          process.exit(0);
        }
      }
    }
  } else {
    projectPath = path.resolve(projectName!);

    // Check if project directory already exists
    if (await fs.pathExists(projectPath)) {
      console.log();
      console.log(
        boxen(
          `Directory '${chalk.cyan(projectName)}' already exists\n` +
            "Please choose a different project name or remove the existing directory.",
          {
            title: chalk.red("Directory Conflict"),
            padding: 1,
            borderColor: "red",
          }
        )
      );
      console.log();
      process.exit(1);
    }
  }

  // Create formatted setup info
  const currentDir = process.cwd();

  const setupLines = [
    chalk.cyan("BuildForce Project Setup"),
    "",
    `${"Project".padEnd(15)} ${chalk.green(projectName)}`,
    `${"Working Path".padEnd(15)} ${chalk.dim(currentDir)}`,
  ];

  if (!isHere) {
    setupLines.push(`${"Target Path".padEnd(15)} ${chalk.dim(projectPath)}`);
  }

  console.log(
    boxen(setupLines.join("\n"), {
      padding: 1,
      borderColor: "cyan",
    })
  );
  console.log();

  // Check git only if we might need it (not --no-git)
  let shouldInitGit = false;
  if (!noGit) {
    shouldInitGit = checkTool("git");
    if (!shouldInitGit) {
      console.log(
        chalk.yellow("Git not found - will skip repository initialization")
      );
    }
  }

  // AI assistant selection
  let selectedAi: string;
  if (inputAiAssistant) {
    if (!AI_CHOICES[inputAiAssistant]) {
      console.error(
        chalk.red("Error:"),
        `Invalid AI assistant '${inputAiAssistant}'. Choose from: ${Object.keys(
          AI_CHOICES
        ).join(", ")}`
      );
      process.exit(1);
    }
    selectedAi = inputAiAssistant;
  } else {
    // Use arrow-key selection interface
    selectedAi = await selectWithArrows(
      AI_CHOICES,
      "Choose your AI assistant:",
      "copilot"
    );
  }

  // Check agent tools unless ignored
  if (!ignoreAgentTools) {
    let agentToolMissing = false;
    let installUrl = "";

    const agentChecks: Record<string, string> = {
      claude: "https://docs.anthropic.com/en/docs/claude-code/setup",
      gemini: "https://github.com/google-gemini/gemini-cli",
      qwen: "https://github.com/QwenLM/qwen-code",
      opencode: "https://opencode.ai",
      codex: "https://github.com/openai/codex",
      auggie:
        "https://docs.augmentcode.com/cli/setup-auggie/install-auggie-cli",
    };

    if (agentChecks[selectedAi]) {
      if (!checkTool(selectedAi)) {
        installUrl = agentChecks[selectedAi];
        agentToolMissing = true;
      }
    }

    if (agentToolMissing) {
      console.log();
      console.log(
        boxen(
          `${chalk.cyan(selectedAi)} not found\n` +
            `Install with: ${chalk.cyan(installUrl)}\n` +
            `${AI_CHOICES[selectedAi]} is required to continue with this project type.\n\n` +
            `Tip: Use ${chalk.cyan("--ignore-agent-tools")} to skip this check`,
          {
            title: chalk.red("Agent Detection Error"),
            padding: 1,
            borderColor: "red",
          }
        )
      );
      console.log();
      process.exit(1);
    }
  }

  // Determine script type
  let selectedScript: string;
  if (inputScriptType) {
    if (!SCRIPT_TYPE_CHOICES[inputScriptType]) {
      console.error(
        chalk.red("Error:"),
        `Invalid script type '${inputScriptType}'. Choose from: ${Object.keys(
          SCRIPT_TYPE_CHOICES
        ).join(", ")}`
      );
      process.exit(1);
    }
    selectedScript = inputScriptType;
  } else {
    // Auto-detect default
    const defaultScript = process.platform === "win32" ? "ps" : "sh";

    // Provide interactive selection if stdin is a TTY
    if (process.stdin.isTTY) {
      selectedScript = await selectWithArrows(
        SCRIPT_TYPE_CHOICES,
        "Choose script type (or press Enter)",
        defaultScript
      );
    } else {
      selectedScript = defaultScript;
    }
  }

  console.log(chalk.cyan("Selected AI assistant:"), selectedAi);
  console.log(chalk.cyan("Selected script type:"), selectedScript);
  console.log();

  // Download and set up project with tracker
  const tracker = new StepTracker("Initialize BuildForce Project");

  // Pre-steps recorded as completed before live rendering
  tracker.add("precheck", "Check required tools");
  tracker.complete("precheck", "ok");
  tracker.add("ai-select", "Select AI assistant");
  tracker.complete("ai-select", selectedAi);
  tracker.add("script-select", "Select script type");
  tracker.complete("script-select", selectedScript);

  // Add pending steps
  const steps = [
    ["fetch", "Fetch latest release"],
    ["download", "Download template"],
    ["extract", "Extract template"],
    ["zip-list", "Archive contents"],
    ["extracted-summary", "Extraction summary"],
    ["chmod", "Ensure scripts executable"],
    ["cleanup", "Cleanup"],
    ["git", "Initialize git repository"],
    ["final", "Finalize"],
  ];

  for (const [key, label] of steps) {
    tracker.add(key, label);
  }

  // Simple live rendering simulation (just re-print)
  let lastRender = "";
  const renderTracker = () => {
    const current = tracker.render();
    if (current !== lastRender) {
      // Clear previous lines
      if (lastRender) {
        const lineCount = lastRender.split("\n").length;
        process.stdout.write("\x1b[" + lineCount + "A"); // Move cursor up
        process.stdout.write("\x1b[J"); // Clear from cursor down
      }
      console.log(current);
      lastRender = current;
    }
  };

  tracker.attachRefresh(renderTracker);

  try {
    // Initial render
    renderTracker();

    await downloadAndExtractTemplate(
      projectPath,
      selectedAi,
      selectedScript,
      isHere,
      {
        verbose: false,
        tracker,
        debug,
        githubToken,
        skipTls,
      }
    );

    // Ensure scripts are executable (POSIX)
    const { updated, failures } = ensureExecutableScripts(projectPath, debug);
    const detail =
      `${updated} updated` +
      (failures.length ? `, ${failures.length} failed` : "");
    tracker.add("chmod", "Set script permissions recursively");
    if (failures.length) {
      tracker.error("chmod", detail);
    } else {
      tracker.complete("chmod", detail);
    }

    // Git step
    if (!noGit) {
      tracker.start("git");
      if (isGitRepo(projectPath)) {
        tracker.complete("git", "existing repo detected");
      } else if (shouldInitGit) {
        if (initGitRepo(projectPath, true)) {
          tracker.complete("git", "initialized");
        } else {
          tracker.error("git", "init failed");
        }
      } else {
        tracker.skip("git", "git not available");
      }
    } else {
      tracker.skip("git", "--no-git flag");
    }

    tracker.complete("final", "project ready");
  } catch (e: any) {
    tracker.error("final", e.message);
    console.log();
    console.log(
      boxen(`Initialization failed: ${e.message}`, {
        title: "Failure",
        padding: 1,
        borderColor: "red",
      })
    );

    if (debug) {
      const envInfo = [
        `Node      → ${chalk.gray(process.version)}`,
        `Platform  → ${chalk.gray(process.platform)}`,
        `CWD       → ${chalk.gray(process.cwd())}`,
      ];
      console.log();
      console.log(
        boxen(envInfo.join("\n"), {
          title: "Debug Environment",
          padding: 1,
          borderColor: "magenta",
        })
      );
    }

    if (!isHere && (await fs.pathExists(projectPath))) {
      await fs.remove(projectPath);
    }

    process.exit(1);
  }

  // Final render
  renderTracker();
  console.log();
  console.log(chalk.bold.green("Project ready."));

  // Agent folder security notice
  if (AGENT_FOLDER_MAP[selectedAi]) {
    const agentFolder = AGENT_FOLDER_MAP[selectedAi];
    console.log();
    console.log(
      boxen(
        `Some agents may store credentials, auth tokens, or other identifying and private artifacts in the agent folder within your project.\n` +
          `Consider adding ${chalk.cyan(
            agentFolder
          )} (or parts of it) to ${chalk.cyan(
            ".gitignore"
          )} to prevent accidental credential leakage.`,
        {
          title: chalk.yellow("Agent Folder Security"),
          padding: 1,
          borderColor: "yellow",
        }
      )
    );
  }

  // Next steps
  const stepsLines: string[] = [];
  if (!isHere) {
    stepsLines.push(
      `1. Go to the project folder: ${chalk.cyan(`cd ${projectName}`)}`
    );
  } else {
    stepsLines.push("1. You're already in the project directory!");
  }

  let stepNum = 2;

  // Add Codex-specific setup step if needed
  if (selectedAi === "codex") {
    const codexPath = path.join(projectPath, ".codex");
    const cmd =
      process.platform === "win32"
        ? `setx CODEX_HOME "${codexPath}"`
        : `export CODEX_HOME="${codexPath}"`;

    stepsLines.push(
      `${stepNum}. Set ${chalk.cyan(
        "CODEX_HOME"
      )} environment variable before running Codex: ${chalk.cyan(cmd)}`
    );
    stepNum++;
  }

  stepsLines.push(`${stepNum}. Start using slash commands with your AI agent:`);
  stepsLines.push(
    "   2.1 " + chalk.cyan("/constitution") + " - Establish project principles"
  );
  stepsLines.push(
    "   2.2 " + chalk.cyan("/specify") + " - Create baseline specification"
  );
  stepsLines.push(
    "   2.3 " + chalk.cyan("/plan") + " - Create implementation plan"
  );
  stepsLines.push(
    "   2.4 " + chalk.cyan("/tasks") + " - Generate actionable tasks"
  );
  stepsLines.push(
    "   2.5 " + chalk.cyan("/implement") + " - Execute implementation"
  );

  console.log();
  console.log(
    boxen(stepsLines.join("\n"), {
      title: "Next Steps",
      padding: 1,
      borderColor: "cyan",
    })
  );

  // Enhancement commands
  const enhancementLines = [
    `Optional commands that you can use for your specs ${chalk.gray(
      "(improve quality & confidence)"
    )}`,
    "",
    `○ ${chalk.cyan("/clarify")} ${chalk.gray(
      "(optional)"
    )} - Ask structured questions to de-risk ambiguous areas before planning (run before ${chalk.cyan(
      "/plan"
    )} if used)`,
    `○ ${chalk.cyan("/analyze")} ${chalk.gray(
      "(optional)"
    )} - Cross-artifact consistency & alignment report (after ${chalk.cyan(
      "/tasks"
    )}, before ${chalk.cyan("/implement")})`,
  ];

  console.log();
  console.log(
    boxen(enhancementLines.join("\n"), {
      title: "Enhancement Commands",
      padding: 1,
      borderColor: "cyan",
    })
  );

  // Codex warning
  if (selectedAi === "codex") {
    const warningText =
      chalk.bold.yellow("Important Note:") +
      "\n\n" +
      `Custom prompts do not yet support arguments in Codex. You may need to manually specify additional project instructions directly in prompt files located in ${chalk.cyan(
        ".codex/prompts/"
      )}.\n\n` +
      `For more information, see: ${chalk.cyan(
        "https://github.com/openai/codex/issues/2890"
      )}`;

    console.log();
    console.log(
      boxen(warningText, {
        title: "Slash Commands in Codex",
        padding: 1,
        borderColor: "yellow",
      })
    );
  }
}
