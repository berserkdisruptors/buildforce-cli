import fs from "fs-extra";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import chalk from "chalk";
import { StepTracker } from "../../lib/step-tracker.js";
import { downloadTemplateFromGithub } from "../../lib/github.js";
import { saveBuildforceConfig } from "../../utils/config.js";
import { AGENT_FOLDER_MAP, MINT_COLOR } from "../../constants.js";
import { resolveLocalArtifact } from "../../lib/local-artifacts.js";

/**
 * Execute the upgrade process
 * Downloads latest template and selectively replaces commands, templates, and scripts
 * Preserves context and specs directories
 */
export async function executeUpgrade(
  projectPath: string,
  selectedAi: string[],
  selectedScript: string,
  options: {
    dryRun: boolean;
    debug: boolean;
    githubToken?: string;
    skipTls: boolean;
    local?: string | boolean;
  }
): Promise<void> {
  const { dryRun, debug, githubToken, skipTls, local } = options;

  if (debug) {
    console.log(chalk.gray("\n[DEBUG] Upgrade execution options:"));
    console.log(chalk.gray(`  debug: ${debug}`));
    console.log(chalk.gray(`  githubToken: ${githubToken ? githubToken : "undefined"}`));
    console.log(chalk.gray(`  skipTls: ${skipTls}\n`));
  }

  const tracker = new StepTracker(
    dryRun ? "Preview Upgrade (Dry Run)" : "Upgrade Buildforce Project"
  );

  // Pre-steps
  tracker.add("validate", "Validate prerequisites");
  tracker.complete("validate", "ok");

  // Add steps
  const steps = [
    ["fetch", "Fetch latest release"],
    ["download", "Download template"],
    ["extract", "Extract to temporary location"],
    ["backup", "Backup current files"],
    ["replace-commands", "Replace slash commands"],
    ["replace-templates", "Replace templates"],
    ["replace-scripts", "Replace scripts"],
    ["update-config", "Update buildforce.json"],
    ["cleanup", "Cleanup"],
    ["final", "Finalize"],
  ];

  for (const [key, label] of steps) {
    tracker.add(key, label);
  }

  let lastRender = "";
  const renderTracker = () => {
    const current = tracker.render();
    if (current !== lastRender) {
      if (lastRender) {
        const lineCount = lastRender.split("\n").length;
        process.stdout.write("\x1b[" + lineCount + "A");
        process.stdout.write("\x1b[J");
      }
      console.log(current);
      lastRender = current;
    }
  };

  tracker.attachRefresh(renderTracker);

  let tempDirs: Map<string, string> = new Map();
  let zipPaths: Map<string, string> = new Map();
  let backupDir: string | null = null;
  let version: string | undefined;

  const successfulAgents: string[] = [];
  const failedAgents: Array<{ agent: string; error: string }> = [];

  try {
    renderTracker();

    // Download templates for all agents
    for (let i = 0; i < selectedAi.length; i++) {
      const agent = selectedAi[i];
      try {
        // Step 1: Resolve local artifact if --local flag is provided
        let localZipPath: string | undefined;
        if (local) {
          const localDir = typeof local === "string" ? local : ".genreleases";
          try {
            tracker.start("fetch");
            const result = await resolveLocalArtifact(
              localDir,
              agent,
              selectedScript
            );
            localZipPath = result.zipPath;
          } catch (e: any) {
            tracker.error("fetch", e.message);
            throw e;
          }
        } else {
          tracker.start("fetch");
        }

        // Step 2: Download or use local template
        const currentDir = process.cwd();

        const result = await downloadTemplateFromGithub(agent, currentDir, {
          scriptType: selectedScript,
          verbose: false,
          showProgress: false,
          debug,
          githubToken,
          skipTls,
          localZipPath,
        });

        zipPaths.set(agent, result.zipPath);
        const meta = result.metadata;
        version = meta.release;

        tracker.complete(
          "fetch",
          `release ${meta.release} (${agent})`
        );
        tracker.complete("download", meta.filename);

        successfulAgents.push(agent);
      } catch (e: any) {
        failedAgents.push({ agent, error: e.message });
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

    // Extract templates for all successful agents
    const sourceDirs: Map<string, string> = new Map();

    for (const agent of successfulAgents) {
      const zipPath = zipPaths.get(agent)!;
      tracker.start("extract");

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `buildforce-upgrade-${agent}-`));
      tempDirs.set(agent, tempDir);

      const zip = new AdmZip(zipPath);
      zip.extractAllTo(tempDir, true);

      // Handle nested directory structure (GitHub releases)
      const extractedItems = await fs.readdir(tempDir);
      let sourceDir = tempDir;
      if (extractedItems.length === 1) {
        const firstItem = path.join(tempDir, extractedItems[0]);
        if ((await fs.stat(firstItem)).isDirectory()) {
          sourceDir = firstItem;
        }
      }

      sourceDirs.set(agent, sourceDir);
      tracker.complete("extract", `${extractedItems.length} items (${agent})`);
    }

    if (dryRun) {
      // Dry run mode: just show what would be updated
      tracker.start("backup");
      tracker.skip("backup", "dry-run mode");

      for (const agent of successfulAgents) {
        const agentFolder = AGENT_FOLDER_MAP[agent];
        const commandsPath = path.join(projectPath, agentFolder, "commands");

        console.log(chalk.gray(`\nAgent: ${agent}`));

        if (await fs.pathExists(commandsPath)) {
          console.log(chalk.gray(`  would update ${agentFolder}commands/`));
        } else {
          console.log(chalk.gray(`  would create ${agentFolder}commands/`));
        }
      }

      const templatesPath = path.join(projectPath, ".buildforce", "templates");
      const scriptsPath = path.join(projectPath, ".buildforce", "scripts");

      tracker.start("replace-commands");
      tracker.complete("replace-commands", `${successfulAgents.length} agents`);

      tracker.start("replace-templates");
      if (await fs.pathExists(templatesPath)) {
        tracker.complete("replace-templates", "would update .buildforce/templates/");
      } else {
        tracker.complete("replace-templates", "would create .buildforce/templates/");
      }

      tracker.start("replace-scripts");
      if (await fs.pathExists(scriptsPath)) {
        tracker.complete("replace-scripts", "would update .buildforce/scripts/");
      } else {
        tracker.complete("replace-scripts", "would create .buildforce/scripts/");
      }

      tracker.skip("update-config", "dry-run mode");
      tracker.skip("cleanup", "dry-run mode");
      tracker.complete("final", "preview complete");
    } else {
      // Real upgrade mode: create backup and replace files
      tracker.start("backup");
      const backupBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "buildforce-backup-"));
      backupDir = backupBaseDir;

      // Replace commands for each agent
      tracker.start("replace-commands");
      let totalCommandFiles = 0;

      for (const agent of successfulAgents) {
        const agentFolder = AGENT_FOLDER_MAP[agent];
        const sourceDir = sourceDirs.get(agent)!;
        const commandsSrc = path.join(sourceDir, agentFolder, "commands");
        const commandsDest = path.join(projectPath, agentFolder, "commands");

        // Backup commands if they exist
        if (await fs.pathExists(commandsDest)) {
          await fs.copy(commandsDest, path.join(backupDir, agent, "commands"));
        }

        // Replace commands
        if (await fs.pathExists(commandsSrc)) {
          await fs.ensureDir(path.dirname(commandsDest));
          await fs.remove(commandsDest);
          await fs.copy(commandsSrc, commandsDest);
          const commandFiles = await fs.readdir(commandsDest);
          totalCommandFiles += commandFiles.length;
        }
      }

      tracker.complete("backup", `backed up ${successfulAgents.length} agents`);
      tracker.complete("replace-commands", `${totalCommandFiles} command files`);

      // Replace templates (shared across all agents)
      tracker.start("replace-templates");
      // Use first agent's templates as they should be the same
      const firstAgent = successfulAgents[0];
      const firstSourceDir = sourceDirs.get(firstAgent)!;
      const templatesSrc = path.join(firstSourceDir, ".buildforce", "templates");
      const templatesDest = path.join(projectPath, ".buildforce", "templates");

      if (await fs.pathExists(templatesSrc)) {
        if (await fs.pathExists(templatesDest)) {
          await fs.copy(templatesDest, path.join(backupDir, "templates"));
        }
        await fs.remove(templatesDest);
        await fs.copy(templatesSrc, templatesDest);
        tracker.complete("replace-templates", ".buildforce/templates/");
      } else {
        tracker.skip("replace-templates", "no templates in release");
      }

      // Replace scripts (shared across all agents)
      tracker.start("replace-scripts");
      const scriptsSrc = path.join(firstSourceDir, ".buildforce", "scripts");
      const scriptsDest = path.join(projectPath, ".buildforce", "scripts");

      if (await fs.pathExists(scriptsSrc)) {
        if (await fs.pathExists(scriptsDest)) {
          await fs.copy(scriptsDest, path.join(backupDir, "scripts"));
        }
        await fs.remove(scriptsDest);
        await fs.copy(scriptsSrc, scriptsDest);
        tracker.complete("replace-scripts", ".buildforce/scripts/");
      } else {
        tracker.skip("replace-scripts", "no scripts in release");
      }

      // Update buildforce.json with version metadata
      tracker.start("update-config");
      saveBuildforceConfig(projectPath, {
        aiAssistants: successfulAgents,
        scriptType: selectedScript,
        version: version,
      });
      tracker.complete("update-config", `version ${version}`);

      tracker.complete("final", "upgrade complete");
    }

    // Cleanup
    tracker.start("cleanup");
    for (const [agent, tempDir] of tempDirs) {
      if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
      }
    }
    for (const [agent, zipPath] of zipPaths) {
      if (await fs.pathExists(zipPath)) {
        await fs.unlink(zipPath);
      }
    }
    tracker.complete("cleanup");
  } catch (e: any) {
    // Rollback on error
    if (!dryRun && backupDir && (await fs.pathExists(backupDir))) {
      try {
        // Restore from backup for each agent
        for (const agent of successfulAgents) {
          const agentFolder = AGENT_FOLDER_MAP[agent];
          const commandsBackup = path.join(backupDir, agent, "commands");

          if (await fs.pathExists(commandsBackup)) {
            const commandsDest = path.join(projectPath, agentFolder, "commands");
            await fs.remove(commandsDest);
            await fs.copy(commandsBackup, commandsDest);
          }
        }

        const templatesBackup = path.join(backupDir, "templates");
        const scriptsBackup = path.join(backupDir, "scripts");

        if (await fs.pathExists(templatesBackup)) {
          const templatesDest = path.join(projectPath, ".buildforce", "templates");
          await fs.remove(templatesDest);
          await fs.copy(templatesBackup, templatesDest);
        }

        if (await fs.pathExists(scriptsBackup)) {
          const scriptsDest = path.join(projectPath, ".buildforce", "scripts");
          await fs.remove(scriptsDest);
          await fs.copy(scriptsBackup, scriptsDest);
        }

        console.log(MINT_COLOR("\nRollback: Restored previous files from backup"));
      } catch (rollbackError: any) {
        console.log(
          chalk.red("\nRollback failed:"),
          rollbackError.message
        );
      }
    }

    tracker.error("final", e.message);

    // Cleanup on error
    for (const [agent, tempDir] of tempDirs) {
      if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
      }
    }
    for (const [agent, zipPath] of zipPaths) {
      if (await fs.pathExists(zipPath)) {
        await fs.unlink(zipPath);
      }
    }

    throw e;
  } finally {
    renderTracker();
  }
}
