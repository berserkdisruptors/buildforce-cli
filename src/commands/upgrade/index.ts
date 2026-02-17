import chalk from "chalk";
import { UpgradeOptions } from "../../types.js";
import { TAGLINE, MINT_COLOR, GREEN_COLOR } from "../../constants.js";
import { showBanner, selectMultipleWithCheckboxes } from "../../lib/interactive.js";
import { validateUpgradePrerequisites } from "./validation.js";
import { executeUpgrade } from "./execution.js";
import { readBuildforceConfig, saveBuildforceConfig } from "../../utils/config.js";
import { AI_CHOICES } from "../../constants.js";

/**
 * Main upgrade command entry point
 * Orchestrates validation, configuration detection, and upgrade execution
 */
export async function upgradeCommand(options: UpgradeOptions): Promise<void> {
  // Show banner
  showBanner("", TAGLINE);

  const {
    ai: aiOverride,
    dryRun = false,
    debug = false,
    githubToken,
    skipTls = false,
    local,
  } = options;

  // Get current working directory (project root)
  const projectPath = process.cwd();

  // Validate prerequisites
  const validation = validateUpgradePrerequisites(projectPath);
  if (!validation.valid) {
    console.log();
    console.log(chalk.red("✗ Upgrade failed:"), validation.error);
    console.log();
    if (validation.suggestion) {
      console.log(MINT_COLOR("Suggestion:"), validation.suggestion);
      console.log();
    }
    process.exit(1);
  }

  // Read configuration from buildforce.json
  const config = readBuildforceConfig(projectPath);

  // Backward compatibility: Migrate single aiAssistant to aiAssistants array
  let needsMigration = false;
  if (config && (config as any).aiAssistant && !config.aiAssistants) {
    console.log(
      MINT_COLOR("Migrating single agent configuration to multi-agent format...")
    );
    config.aiAssistants = [(config as any).aiAssistant];
    delete (config as any).aiAssistant;
    needsMigration = true;
  }

  // Determine AI agent(s) (override > prompt with defaults)
  let selectedAi: string[];
  if (aiOverride) {
    // Handle array input from Commander.js variadic option
    const aiArray = Array.isArray(aiOverride) ? aiOverride : [aiOverride];
    // Validate each agent
    for (const ai of aiArray) {
      if (!AI_CHOICES[ai]) {
        console.log();
        console.log(
          chalk.red("✗ Invalid AI agent:"),
          ai
        );
        console.log(MINT_COLOR("Valid options:"), Object.keys(AI_CHOICES).join(", "));
        console.log();
        process.exit(1);
      }
    }

    // Merge with existing config (additive behavior)
    const existingAgents = config?.aiAssistants || [];
    selectedAi = Array.from(new Set([...existingAgents, ...aiArray]));

    console.log(
      MINT_COLOR("AI agent(s) (merged):"),
      selectedAi.join(", ")
    );
  } else {
    // Always prompt for AI agent selection (matching init command behavior)
    const existingAi = config?.aiAssistants && config.aiAssistants.length > 0
      ? config.aiAssistants
      : ["claude"];

    // Show context-aware message
    if (config?.aiAssistants && config.aiAssistants.length > 0) {
      console.log(
        MINT_COLOR(
          `Modify your AI agent(s) (current: ${config.aiAssistants.join(", ")}):`
        )
      );
    } else {
      console.log(
        MINT_COLOR(
          "No AI agent found in buildforce.json. Please select one or more:"
        )
      );
    }

    selectedAi = await selectMultipleWithCheckboxes(
      AI_CHOICES,
      "Choose your AI agent(s) (use spacebar to select, enter to confirm):",
      existingAi
    );
  }

  // Save migrated config if needed
  if (needsMigration && config) {
    saveBuildforceConfig(projectPath, config);
    console.log(MINT_COLOR("Migration complete."));
  }

  console.log();

  // Execute upgrade
  try {
    await executeUpgrade(projectPath, selectedAi, {
      dryRun,
      debug,
      githubToken,
      skipTls,
      local,
    });

    console.log();
    console.log(GREEN_COLOR.bold("✓ Upgrade complete!"));
    console.log();
  } catch (e: any) {
    console.log();
    console.log(chalk.red("✗ Upgrade failed:"), e.message);
    if (debug && e.stack) {
      console.log();
      console.log(chalk.gray(e.stack));
    }
    console.log();
    process.exit(1);
  }
}
