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
import { resolveLocalArtifact } from "../../lib/local-artifacts.js";

/**
 * Execute project setup steps with progress tracking
 */
export async function setupProject(
  projectPath: string,
  selectedAi: string[],
  selectedScript: string,
  isHere: boolean,
  options: {
    debug: boolean;
    githubToken?: string;
    skipTls: boolean;
    noGit: boolean;
    shouldInitGit: boolean;
    local?: string | boolean;
  }
): Promise<void> {
  const { debug, githubToken, skipTls, noGit, shouldInitGit, local } = options;
  const tracker = new StepTracker("Initialize Buildforce Project");

  // Pre-steps recorded as completed before live rendering
  tracker.add("precheck", "Check required tools");
  tracker.complete("precheck", "ok");
  tracker.add("ai-select", "Select AI assistant(s)");
  tracker.complete("ai-select", selectedAi.join(", "));
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

    // Download and extract templates for each selected agent
    let version: string | undefined;
    const successfulAgents: string[] = [];
    const failedAgents: Array<{ agent: string; error: string }> = [];

    for (let i = 0; i < selectedAi.length; i++) {
      const agent = selectedAi[i];
      try {
        // Resolve local artifact if --local flag is provided
        let localZipPath: string | undefined;
        if (local) {
          const localDir = typeof local === "string" ? local : ".genreleases";
          try {
            const result = await resolveLocalArtifact(
              localDir,
              agent,
              selectedScript
            );
            localZipPath = result.zipPath;
          } catch (e: any) {
            tracker.error(`fetch-${agent}`, e.message);
            throw e;
          }
        }

        // Tracker will show progress for current agent

        const result = await downloadAndExtractTemplate(
          projectPath,
          agent,
          selectedScript,
          isHere,
          {
            verbose: false,
            tracker,
            debug,
            githubToken,
            skipTls,
            localZipPath,
          }
        );

        version = result.version;
        successfulAgents.push(agent);
      } catch (e: any) {
        failedAgents.push({ agent, error: e.message });
        // Continue with remaining agents instead of throwing
        if (debug) {
          console.log(chalk.gray(`\nFailed to download ${agent}: ${e.message}`));
        }
      }
    }

    // If all agents failed, throw error
    if (successfulAgents.length === 0) {
      throw new Error(
        `All agent template downloads failed:\n${failedAgents.map(f => `- ${f.agent}: ${f.error}`).join("\n")}`
      );
    }

    // If some agents failed, log warning but continue
    if (failedAgents.length > 0) {
      console.log();
      console.log(
        chalk.yellow(
          `⚠ Warning: Some agents failed to download:\n${failedAgents.map(f => `- ${f.agent}: ${f.error}`).join("\n")}`
        )
      );
      console.log(chalk.yellow(`Successfully downloaded: ${successfulAgents.join(", ")}`));
      console.log();
    }

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
    const configContent = createConfigContent(successfulAgents, selectedScript, version);

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

    // Ensure buildforce.json and .temp folder are in .gitignore
    const gitignorePath = path.join(projectPath, ".gitignore");
    if (await fs.pathExists(gitignorePath)) {
      let gitignoreContent = await fs.readFile(gitignorePath, "utf8");
      let modified = false;

      // Check if buildforce.json is already in gitignore
      if (!gitignoreContent.includes(".buildforce/buildforce.json")) {
        // Check if .current-spec exists and replace it, or just add buildforce.json
        if (gitignoreContent.includes(".buildforce/.current-spec")) {
          gitignoreContent = gitignoreContent.replace(
            ".buildforce/.current-spec",
            ".buildforce/buildforce.json"
          );
          modified = true;

          if (debug) {
            console.log(chalk.gray(`\nUpdated .gitignore: replaced .current-spec with buildforce.json`));
          }
        } else {
          // Add buildforce.json to gitignore
          gitignoreContent = gitignoreContent.trimEnd() + "\n.buildforce/buildforce.json\n";
          modified = true;

          if (debug) {
            console.log(chalk.gray(`\nUpdated .gitignore: added buildforce.json`));
          }
        }
      }

      // Check if .buildforce/.temp is already in gitignore
      if (!gitignoreContent.includes(".buildforce/.temp")) {
        gitignoreContent = gitignoreContent.trimEnd() + "\n.buildforce/.temp\n";
        modified = true;

        if (debug) {
          console.log(chalk.gray(`\nUpdated .gitignore: added .buildforce/.temp`));
        }
      }

      // Check if .buildforce/scripts is already in gitignore
      if (!gitignoreContent.includes(".buildforce/scripts")) {
        gitignoreContent = gitignoreContent.trimEnd() + "\n.buildforce/scripts\n";
        modified = true;

        if (debug) {
          console.log(chalk.gray(`\nUpdated .gitignore: added .buildforce/scripts`));
        }
      }

      // Check if .buildforce/templates is already in gitignore
      if (!gitignoreContent.includes(".buildforce/templates")) {
        gitignoreContent = gitignoreContent.trimEnd() + "\n.buildforce/templates\n";
        modified = true;

        if (debug) {
          console.log(chalk.gray(`\nUpdated .gitignore: added .buildforce/templates`));
        }
      }

      // Write the file only if modifications were made
      if (modified) {
        await fs.writeFile(gitignorePath, gitignoreContent, "utf8");
      }
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
  const { createBox } = await import("../../utils/box.js");

  console.log();
  console.log(createBox(`Initialization failed: ${e.message}`, {
    title: "Failure",
    borderColor: "red",
  }));

  if (debug) {
    const envInfo = [
      `Node      → ${chalk.gray(process.version)}`,
      `Platform  → ${chalk.gray(process.platform)}`,
      `CWD       → ${chalk.gray(process.cwd())}`,
    ];
    console.log();
    console.log(createBox(envInfo.join("\n"), {
      title: "Debug Environment",
      borderColor: "magenta",
    }));
  }

  if (!isHere && (await fs.pathExists(projectPath))) {
    await fs.remove(projectPath);
  }

  process.exit(1);
}
