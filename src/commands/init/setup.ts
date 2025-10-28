import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { StepTracker } from "../../lib/step-tracker.js";
import { downloadAndExtractTemplate } from "../../lib/extract.js";
import {
  ensureExecutableScripts,
  isGitRepo,
  initGitRepo,
} from "../../utils/index.js";
import { createConfigContent } from "../../utils/config.js";

/**
 * Execute project setup steps with progress tracking
 */
export async function setupProject(
  projectPath: string,
  selectedAi: string,
  selectedScript: string,
  isHere: boolean,
  options: {
    debug: boolean;
    githubToken?: string;
    skipTls: boolean;
    noGit: boolean;
    shouldInitGit: boolean;
  }
): Promise<void> {
  const { debug, githubToken, skipTls, noGit, shouldInitGit } = options;
  const tracker = new StepTracker("Initialize Buildforce Project");

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
    ["config", "Create configuration file"],
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

    const { version } = await downloadAndExtractTemplate(
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

    // Create buildforce.json config file
    tracker.start("config");
    // Ensure .buildforce directory exists
    const buildforceDir = path.join(projectPath, ".buildforce");
    await fs.ensureDir(buildforceDir);

    const configPath = path.join(buildforceDir, "buildforce.json");
    const configContent = createConfigContent(selectedAi, selectedScript, version);

    if (debug) {
      console.log(chalk.gray(`\nWriting config to: ${configPath}`));
      console.log(chalk.gray(`Config content:\n${configContent}`));
    }

    await fs.writeFile(configPath, configContent, "utf8");

    // Verify file was created
    const configExists = await fs.pathExists(configPath);
    if (!configExists) {
      const errorMsg = "buildforce.json was not created";
      tracker.error("config", errorMsg);
      throw new Error(errorMsg);
    }

    if (debug) {
      const writtenContent = await fs.readFile(configPath, "utf8");
      console.log(chalk.gray(`\nVerified config file exists`));
      console.log(chalk.gray(`Content: ${writtenContent.substring(0, 100)}...`));
    }

    tracker.complete("config", ".buildforce/buildforce.json");

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
    throw e;
  } finally {
    // Final render
    renderTracker();
  }
}

/**
 * Handle setup errors
 */
export async function handleSetupError(
  e: any,
  projectPath: string,
  isHere: boolean,
  debug: boolean
): Promise<void> {
  const boxen = (await import("boxen")).default;

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
