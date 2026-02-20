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
import { createMigrationRunner } from "./migrations/registry.js";
import { mergeAgentSettings } from "../../utils/settings-merge.js";
import { ensureBuildforceInstructionFiles } from "../../utils/agent-instructions.js";

/**
 * Execute the upgrade process
 * Downloads latest template and replaces skills, agents, and hooks
 * Preserves context and specs directories
 */
export async function executeUpgrade(
  projectPath: string,
  selectedAi: string[],
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

  // Add steps (pluralize labels when multiple agents selected)
  const isMultiAgent = selectedAi.length > 1;
  const steps = [
    ["fetch", isMultiAgent ? "Fetch latest releases" : "Fetch latest release"],
    ["download", isMultiAgent ? "Download templates" : "Download template"],
    ["extract", isMultiAgent ? "Extract to temporary locations" : "Extract to temporary location"],
    ["backup", "Backup current files"],
    ["replace-skills", "Replace skills"],
    ["merge-settings", "Merge agent settings"],
    ["migrate-context", "Migrate context structure"],
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
    const downloadedAgents: string[] = [];

    for (let i = 0; i < selectedAi.length; i++) {
      const agent = selectedAi[i];
      try {
        // Step 1: Resolve local artifact if --local flag is provided
        let localZipPath: string | undefined;
        if (local) {
          const localDir = typeof local === "string" ? local : ".genreleases";
          try {
            tracker.start("fetch", isMultiAgent ? `${agent} (${i + 1}/${selectedAi.length})` : "");
            const result = await resolveLocalArtifact(
              localDir,
              agent
            );
            localZipPath = result.zipPath;
          } catch (e: any) {
            tracker.error("fetch", e.message);
            throw e;
          }
        } else {
          tracker.start("fetch", isMultiAgent ? `${agent} (${i + 1}/${selectedAi.length})` : "");
        }

        // Step 2: Download or use local template
        const currentDir = process.cwd();

        const result = await downloadTemplateFromGithub(agent, currentDir, {
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

        downloadedAgents.push(agent);
        tracker.complete(
          "fetch",
          isMultiAgent
            ? `release ${meta.release} (${downloadedAgents.length}/${selectedAi.length} agents)`
            : `release ${meta.release} (${agent})`
        );
        tracker.complete(
          "download",
          isMultiAgent ? downloadedAgents.join(", ") : meta.filename
        );

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

    let extractCount = 0;

    for (const agent of successfulAgents) {
      const zipPath = zipPaths.get(agent)!;
      extractCount++;
      tracker.start("extract", isMultiAgent ? `${agent} (${extractCount}/${successfulAgents.length})` : "");

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
      tracker.complete(
        "extract",
        isMultiAgent
          ? `${extractCount}/${successfulAgents.length} agents`
          : `${extractedItems.length} items (${agent})`
      );
    }

    if (dryRun) {
      // Dry run mode: just show what would be updated
      tracker.start("backup");
      tracker.skip("backup", "dry-run mode");

      for (const agent of successfulAgents) {
        const agentFolder = AGENT_FOLDER_MAP[agent];
        const sourceDir = sourceDirs.get(agent)!;
        const agentsPath = path.join(projectPath, agentFolder, "agents");
        const agentsSrcPath = path.join(sourceDir, agentFolder, "agents");

        console.log(chalk.gray(`\nAgent: ${agent}`));

        // Check if source has agents (e.g., .claude/agents for Claude Code)
        if (await fs.pathExists(agentsSrcPath)) {
          if (await fs.pathExists(agentsPath)) {
            console.log(chalk.gray(`  would update ${agentFolder}/agents/`));
          } else {
            console.log(chalk.gray(`  would create ${agentFolder}/agents/`));
          }
        }

        // Check if source has skills (e.g., .claude/skills for Claude Code)
        const skillsSrcPath = path.join(sourceDir, agentFolder, "skills");
        const skillsPath = path.join(projectPath, agentFolder, "skills");
        if (await fs.pathExists(skillsSrcPath)) {
          if (await fs.pathExists(skillsPath)) {
            console.log(chalk.gray(`  would update ${agentFolder}/skills/`));
          } else {
            console.log(chalk.gray(`  would create ${agentFolder}/skills/`));
          }
        }

        // Check if source has hooks (e.g., .claude/hooks for Claude Code)
        const hooksSrcPath = path.join(sourceDir, agentFolder, "hooks");
        const hooksPath = path.join(projectPath, agentFolder, "hooks");
        if (await fs.pathExists(hooksSrcPath)) {
          if (await fs.pathExists(hooksPath)) {
            console.log(chalk.gray(`  would update ${agentFolder}/hooks/`));
          } else {
            console.log(chalk.gray(`  would create ${agentFolder}/hooks/`));
          }
          console.log(chalk.gray(`  would merge hooks config into ${agentFolder}settings.local.json`));
        }
      }

      // Check skills for all agents
      tracker.start("replace-skills");
      let dryRunSkillCount = 0;
      for (const agent of successfulAgents) {
        const agentFolder = AGENT_FOLDER_MAP[agent];
        const skillsSrcPath = path.join(sourceDirs.get(agent)!, agentFolder, "skills");
        if (await fs.pathExists(skillsSrcPath)) {
          const sourceSkills = await fs.readdir(skillsSrcPath);
          dryRunSkillCount += sourceSkills.length;
        }
      }
      if (dryRunSkillCount > 0) {
        tracker.complete("replace-skills", `would update ${dryRunSkillCount} skill(s)`);
      } else {
        tracker.skip("replace-skills", "no skills in release");
      }

      tracker.skip("merge-settings", "dry-run mode");
      tracker.skip("migrate-context", "dry-run mode");
      tracker.skip("update-config", "dry-run mode");
      tracker.skip("cleanup", "dry-run mode");
      tracker.complete("final", "preview complete");
    } else {
      // Real upgrade mode: create backup and replace files
      tracker.start("backup");
      const backupBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "buildforce-backup-"));
      backupDir = backupBaseDir;

      tracker.complete("backup", `backed up ${successfulAgents.length} agents`);

      // Replace agents for each agent (e.g., .claude/agents/ for Claude Code sub-agents)
      for (const agent of successfulAgents) {
        const agentFolder = AGENT_FOLDER_MAP[agent];
        const sourceDir = sourceDirs.get(agent)!;
        const agentsSrc = path.join(sourceDir, agentFolder, "agents");
        const agentsDest = path.join(projectPath, agentFolder, "agents");

        if (await fs.pathExists(agentsSrc)) {
          // Backup agents if they exist
          if (await fs.pathExists(agentsDest)) {
            await fs.copy(agentsDest, path.join(backupDir, agent, "agents"));
          }

          // Replace agents
          await fs.ensureDir(path.dirname(agentsDest));
          await fs.remove(agentsDest);
          await fs.copy(agentsSrc, agentsDest);
        }

        // Replace skills (e.g., .claude/skills/ for Claude Code)
        const skillsSrc = path.join(sourceDir, agentFolder, "skills");
        const skillsDest = path.join(projectPath, agentFolder, "skills");

        if (await fs.pathExists(skillsSrc)) {
          // Backup skills if they exist
          if (await fs.pathExists(skillsDest)) {
            await fs.copy(skillsDest, path.join(backupDir, agent, "skills"));
          }

          // Replace skills
          await fs.ensureDir(path.dirname(skillsDest));
          await fs.remove(skillsDest);
          await fs.copy(skillsSrc, skillsDest);
        }

        // Replace hooks (e.g., .claude/hooks/ for Claude Code)
        const hooksSrc = path.join(sourceDir, agentFolder, "hooks");
        const hooksDest = path.join(projectPath, agentFolder, "hooks");

        if (await fs.pathExists(hooksSrc)) {
          // Backup hooks if they exist
          if (await fs.pathExists(hooksDest)) {
            await fs.copy(hooksDest, path.join(backupDir, agent, "hooks"));
          }

          // Replace hooks
          await fs.ensureDir(path.dirname(hooksDest));
          await fs.remove(hooksDest);
          await fs.copy(hooksSrc, hooksDest);
        }
      }

      // Use first agent's source for shared resources
      const firstAgent = successfulAgents[0];
      const firstSourceDir = sourceDirs.get(firstAgent)!;

      // Replace skills for all agents
      tracker.start("replace-skills");
      let totalSkillsReplaced = 0;

      for (const agent of successfulAgents) {
        const agentFolder = AGENT_FOLDER_MAP[agent];
        const sourceDir = sourceDirs.get(agent)!;
        const skillsSrc = path.join(sourceDir, agentFolder, "skills");
        const skillsDest = path.join(projectPath, agentFolder, "skills");

        if (await fs.pathExists(skillsSrc)) {
          const sourceSkills = await fs.readdir(skillsSrc);

          if (sourceSkills.length > 0) {
            await fs.ensureDir(skillsDest);

            for (const skillName of sourceSkills) {
              const skillSrcPath = path.join(skillsSrc, skillName);
              const skillDestPath = path.join(skillsDest, skillName);

              // Backup existing skill if it exists
              if (await fs.pathExists(skillDestPath)) {
                await fs.copy(skillDestPath, path.join(backupDir, agent, "skills", skillName));
              }

              // Replace the skill
              await fs.remove(skillDestPath);
              await fs.copy(skillSrcPath, skillDestPath);
            }

            totalSkillsReplaced += sourceSkills.length;
          }
        }
      }

      if (totalSkillsReplaced > 0) {
        tracker.complete("replace-skills", `${totalSkillsReplaced} skill(s)`);
      } else {
        tracker.skip("replace-skills", "no skills in release");
      }

      // Merge agent settings for all successful agents
      tracker.start("merge-settings");
      let totalHooksAdded = 0;
      let anyMerged = false;

      for (const agent of successfulAgents) {
        const agentFolder = AGENT_FOLDER_MAP[agent];
        const mergeResult = await mergeAgentSettings(projectPath, agentFolder, {
          debug,
        });

        if (mergeResult.merged) {
          anyMerged = true;
          totalHooksAdded += mergeResult.hooksAdded || 0;
        }
      }

      if (anyMerged) {
        const detail = totalHooksAdded
          ? `${totalHooksAdded} hook(s)`
          : "merged";
        tracker.complete("merge-settings", detail);
      } else {
        tracker.skip("merge-settings", "no agents required settings merge");
      }

      // Migrate context structure using MigrationRunner
      // The runner automatically detects current version and runs all needed migrations
      tracker.start("migrate-context");
      try {
        const runner = createMigrationRunner();
        const migrationResult = await runner.run(projectPath, firstSourceDir);

        if (migrationResult.migrated) {
          const migratedVersions = migrationResult.appliedMigrations.join(" → ");
          tracker.complete(
            "migrate-context",
            `${migrationResult.fromVersion || "1.0"} → ${migrationResult.toVersion} (${migratedVersions})`
          );
          if (debug && migrationResult.actions.length > 0) {
            console.log(chalk.gray("\n[DEBUG] Migration actions:"));
            for (const action of migrationResult.actions) {
              console.log(chalk.gray(`  ${action}`));
            }
          }
          if (migrationResult.errors.length > 0) {
            console.log(chalk.yellow("\nMigration warnings:"));
            for (const error of migrationResult.errors) {
              console.log(chalk.yellow(`  - ${error}`));
            }
          }
        } else if (migrationResult.alreadyLatest) {
          tracker.skip("migrate-context", `already at v${migrationResult.toVersion}`);
        } else {
          tracker.skip("migrate-context", "no context to migrate");
        }
      } catch (migrationError: any) {
        // Don't fail the upgrade if migration fails - just warn
        tracker.skip("migrate-context", `error: ${migrationError.message}`);
        if (debug) {
          console.log(chalk.yellow(`\n[DEBUG] Migration error: ${migrationError.message}`));
        }
      }

      // Update buildforce.json with version metadata
      tracker.start("update-config");
      saveBuildforceConfig(projectPath, {
        aiAssistants: successfulAgents,
        version: version,
      });
      tracker.complete("update-config", `version ${version}`);

      // Keep AGENTS.md / CLAUDE.md aligned with Buildforce context usage.
      const instructionFiles = await ensureBuildforceInstructionFiles(projectPath, {
        selectedAi: successfulAgents,
      });
      if (debug && instructionFiles.updated.length > 0) {
        console.log(
          chalk.gray(
            `[instructions] updated: ${instructionFiles.updated.join(", ")}`
          )
        );
      }

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
          const agentsBackup = path.join(backupDir, agent, "agents");

          if (await fs.pathExists(agentsBackup)) {
            const agentsDest = path.join(projectPath, agentFolder, "agents");
            await fs.remove(agentsDest);
            await fs.copy(agentsBackup, agentsDest);
          }

          const skillsBackup = path.join(backupDir, agent, "skills");
          if (await fs.pathExists(skillsBackup)) {
            const skillsDest = path.join(projectPath, agentFolder, "skills");
            await fs.remove(skillsDest);
            await fs.copy(skillsBackup, skillsDest);
          }

          const hooksBackup = path.join(backupDir, agent, "hooks");
          if (await fs.pathExists(hooksBackup)) {
            const hooksDest = path.join(projectPath, agentFolder, "hooks");
            await fs.remove(hooksDest);
            await fs.copy(hooksBackup, hooksDest);
          }
        }

        // Skills are now backed up per-agent inside the agent backup dir
        // (handled by the per-agent skills restore above)

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
