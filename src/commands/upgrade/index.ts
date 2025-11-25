import chalk from "chalk";
import { UpgradeOptions } from "../../types.js";
import { TAGLINE, MINT_COLOR, GREEN_COLOR } from "../../constants.js";
import { showBanner, selectMultipleWithCheckboxes } from "../../lib/interactive.js";
import { validateUpgradePrerequisites } from "./validation.js";
import { executeUpgrade } from "./execution.js";
import { readBuildforceConfig, saveBuildforceConfig } from "../../utils/config.js";
import { AI_CHOICES, SCRIPT_TYPE_CHOICES } from "../../constants.js";
import { selectWithArrows } from "../../lib/interactive.js";

/**
 * Main upgrade command entry point
 * Orchestrates validation, configuration detection, and upgrade execution
 */
export async function upgradeCommand(options: UpgradeOptions): Promise<void> {
  // Show banner
  showBanner("", TAGLINE);

  const {
    ai: aiOverride,
    script: scriptOverride,
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

  // Determine AI assistant(s) (override > prompt with defaults)
  let selectedAi: string[];
  if (aiOverride) {
    // Handle array input from Commander.js variadic option
    const aiArray = Array.isArray(aiOverride) ? aiOverride : [aiOverride];
    // Validate each assistant
    for (const ai of aiArray) {
      if (!AI_CHOICES[ai]) {
        console.log();
        console.log(
          chalk.red("✗ Invalid AI assistant:"),
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
      MINT_COLOR("AI assistant(s) (merged):"),
      selectedAi.join(", ")
    );
  } else {
    // Always prompt for AI assistant selection (matching init command behavior)
    const existingAi = config?.aiAssistants && config.aiAssistants.length > 0
      ? config.aiAssistants
      : ["claude"];

    // Show context-aware message
    if (config?.aiAssistants && config.aiAssistants.length > 0) {
      console.log(
        MINT_COLOR(
          `Modify your AI assistant(s) (current: ${config.aiAssistants.join(", ")}):`
        )
      );
    } else {
      console.log(
        MINT_COLOR(
          "No AI assistant found in buildforce.json. Please select one or more:"
        )
      );
    }

    selectedAi = await selectMultipleWithCheckboxes(
      AI_CHOICES,
      "Choose your AI assistant(s) (use spacebar to select, enter to confirm):",
      existingAi
    );
  }

  // Save migrated config if needed
  if (needsMigration && config) {
    saveBuildforceConfig(projectPath, config);
    console.log(MINT_COLOR("Migration complete."));
  }

  // Determine script type (override > config > prompt)
  let selectedScript: string;
  if (scriptOverride) {
    // Validate override
    if (!SCRIPT_TYPE_CHOICES[scriptOverride]) {
      console.log();
      console.log(
        chalk.red("✗ Invalid script type:"),
        scriptOverride
      );
      console.log(
        MINT_COLOR("Valid options:"),
        Object.keys(SCRIPT_TYPE_CHOICES).join(", ")
      );
      console.log();
      process.exit(1);
    }
    selectedScript = scriptOverride;
    console.log(
      MINT_COLOR("Script type (override):"),
      SCRIPT_TYPE_CHOICES[selectedScript]
    );
  } else if (config?.scriptType) {
    selectedScript = config.scriptType;
    console.log(
      MINT_COLOR("Script type (detected):"),
      SCRIPT_TYPE_CHOICES[selectedScript] || selectedScript
    );
  } else {
    // Backward compatibility: prompt for script type if missing
    const defaultScript = process.platform === "win32" ? "ps" : "sh";
    console.log(
      MINT_COLOR(
        "No script type found in buildforce.json. Please select one:"
      )
    );
    selectedScript = await selectWithArrows(
      SCRIPT_TYPE_CHOICES,
      "Choose script type:",
      defaultScript
    );
  }

  console.log();

  // Execute upgrade
  try {
    await executeUpgrade(projectPath, selectedAi, selectedScript, {
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
