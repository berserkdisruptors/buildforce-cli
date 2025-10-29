import fs from "fs-extra";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import chalk from "chalk";
import { StepTracker } from "../../lib/step-tracker.js";
import { downloadTemplateFromGithub } from "../../lib/github.js";
import { saveBuildforceConfig } from "../../utils/config.js";
import { AGENT_FOLDER_MAP } from "../../constants.js";
import { resolveLocalArtifact } from "../../lib/local-artifacts.js";

/**
 * Execute the upgrade process
 * Downloads latest template and selectively replaces commands, templates, and scripts
 * Preserves context and specs directories
 */
export async function executeUpgrade(
  projectPath: string,
  selectedAi: string,
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

  let tempDir: string | null = null;
  let zipPath: string | null = null;
  let backupDir: string | null = null;

  try {
    renderTracker();

    // Step 1: Resolve local artifact if --local flag is provided
    let localZipPath: string | undefined;
    if (local) {
      const localDir = typeof local === "string" ? local : ".genreleases";
      try {
        tracker.start("fetch");
        const result = await resolveLocalArtifact(
          localDir,
          selectedAi,
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

    const result = await downloadTemplateFromGithub(selectedAi, currentDir, {
      scriptType: selectedScript,
      verbose: false,
      showProgress: false,
      debug,
      githubToken,
      skipTls,
      localZipPath,
    });

    zipPath = result.zipPath;
    const meta = result.metadata;

    tracker.complete(
      "fetch",
      `release ${meta.release} (${meta.size.toLocaleString()} bytes)`
    );
    tracker.complete("download", meta.filename);

    // Step 2: Extract to temp directory
    tracker.start("extract");
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "buildforce-upgrade-"));

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

    tracker.complete("extract", `${extractedItems.length} items`);

    if (dryRun) {
      // Dry run mode: just show what would be updated
      tracker.start("backup");
      tracker.skip("backup", "dry-run mode");

      const agentFolder = AGENT_FOLDER_MAP[selectedAi];
      const commandsPath = path.join(projectPath, agentFolder, "commands");
      const templatesPath = path.join(projectPath, ".buildforce", "templates");
      const scriptsPath = path.join(projectPath, ".buildforce", "scripts");

      tracker.start("replace-commands");
      if (await fs.pathExists(commandsPath)) {
        tracker.complete("replace-commands", `would update ${agentFolder}commands/`);
      } else {
        tracker.complete("replace-commands", `would create ${agentFolder}commands/`);
      }

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
      backupDir = path.join(tempDir, "backup");
      await fs.ensureDir(backupDir);

      const agentFolder = AGENT_FOLDER_MAP[selectedAi];
      const commandsSrc = path.join(sourceDir, agentFolder, "commands");
      const commandsDest = path.join(projectPath, agentFolder, "commands");

      // Backup commands if they exist
      if (await fs.pathExists(commandsDest)) {
        await fs.copy(commandsDest, path.join(backupDir, "commands"));
      }

      tracker.complete("backup", "current files backed up");

      // Replace commands
      tracker.start("replace-commands");
      if (await fs.pathExists(commandsSrc)) {
        await fs.ensureDir(path.dirname(commandsDest));
        await fs.remove(commandsDest);
        await fs.copy(commandsSrc, commandsDest);
        const commandFiles = await fs.readdir(commandsDest);
        tracker.complete("replace-commands", `${commandFiles.length} command files`);
      } else {
        tracker.skip("replace-commands", "no commands in template");
      }

      // Replace templates
      tracker.start("replace-templates");
      const templatesSrc = path.join(sourceDir, ".buildforce", "templates");
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

      // Replace scripts
      tracker.start("replace-scripts");
      const scriptsSrc = path.join(sourceDir, ".buildforce", "scripts");
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
        aiAssistant: selectedAi,
        scriptType: selectedScript,
        version: meta.release,
      });
      tracker.complete("update-config", `version ${meta.release}`);

      tracker.complete("final", "upgrade complete");
    }

    // Cleanup
    tracker.start("cleanup");
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
    if (zipPath && (await fs.pathExists(zipPath))) {
      await fs.unlink(zipPath);
    }
    tracker.complete("cleanup");
  } catch (e: any) {
    // Rollback on error
    if (!dryRun && backupDir && (await fs.pathExists(backupDir))) {
      try {
        // Restore from backup
        const agentFolder = AGENT_FOLDER_MAP[selectedAi];
        const commandsBackup = path.join(backupDir, "commands");
        const templatesBackup = path.join(backupDir, "templates");
        const scriptsBackup = path.join(backupDir, "scripts");

        if (await fs.pathExists(commandsBackup)) {
          const commandsDest = path.join(projectPath, agentFolder, "commands");
          await fs.remove(commandsDest);
          await fs.copy(commandsBackup, commandsDest);
        }

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

        console.log(chalk.yellow("\nRollback: Restored previous files from backup"));
      } catch (rollbackError: any) {
        console.log(
          chalk.red("\nRollback failed:"),
          rollbackError.message
        );
      }
    }

    tracker.error("final", e.message);

    // Cleanup on error
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
    if (zipPath && (await fs.pathExists(zipPath))) {
      await fs.unlink(zipPath);
    }

    throw e;
  } finally {
    renderTracker();
  }
}
