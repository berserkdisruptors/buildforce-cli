import chalk from "chalk";
import { UpgradeOptions } from "../../types.js";
import { BANNER, TAGLINE } from "../../constants.js";
import { showBanner } from "../../lib/interactive.js";
import { validateUpgradePrerequisites } from "./validation.js";
import { executeUpgrade } from "./execution.js";
import { readBuildforceConfig } from "../../utils/config.js";
import { AI_CHOICES, SCRIPT_TYPE_CHOICES } from "../../constants.js";
import { selectWithArrows } from "../../lib/interactive.js";

/**
 * Main upgrade command entry point
 * Orchestrates validation, configuration detection, and upgrade execution
 */
export async function upgradeCommand(options: UpgradeOptions): Promise<void> {
  // Show banner
  showBanner(BANNER, TAGLINE);

  const {
    ai: aiOverride,
    script: scriptOverride,
    dryRun = false,
    debug = false,
    githubToken,
    skipTls = false,
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
      console.log(chalk.yellow("Suggestion:"), validation.suggestion);
      console.log();
    }
    process.exit(1);
  }

  // Read configuration from buildforce.json
  const config = readBuildforceConfig(projectPath);

  // Determine AI assistant (override > config > prompt)
  let selectedAi: string;
  if (aiOverride) {
    // Validate override
    if (!AI_CHOICES[aiOverride]) {
      console.log();
      console.log(
        chalk.red("✗ Invalid AI assistant:"),
        aiOverride
      );
      console.log(chalk.yellow("Valid options:"), Object.keys(AI_CHOICES).join(", "));
      console.log();
      process.exit(1);
    }
    selectedAi = aiOverride;
    console.log(
      chalk.cyan("AI assistant (override):"),
      AI_CHOICES[selectedAi]
    );
  } else if (config?.aiAssistant) {
    selectedAi = config.aiAssistant;
    console.log(
      chalk.cyan("AI assistant (detected):"),
      AI_CHOICES[selectedAi] || selectedAi
    );
  } else {
    // Backward compatibility: prompt for AI assistant if missing
    console.log(
      chalk.yellow(
        "No AI assistant found in buildforce.json. Please select one:"
      )
    );
    selectedAi = await selectWithArrows(
      AI_CHOICES,
      "Choose your AI assistant:",
      "copilot"
    );
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
        chalk.yellow("Valid options:"),
        Object.keys(SCRIPT_TYPE_CHOICES).join(", ")
      );
      console.log();
      process.exit(1);
    }
    selectedScript = scriptOverride;
    console.log(
      chalk.cyan("Script type (override):"),
      SCRIPT_TYPE_CHOICES[selectedScript]
    );
  } else if (config?.scriptType) {
    selectedScript = config.scriptType;
    console.log(
      chalk.cyan("Script type (detected):"),
      SCRIPT_TYPE_CHOICES[selectedScript] || selectedScript
    );
  } else {
    // Backward compatibility: prompt for script type if missing
    const defaultScript = process.platform === "win32" ? "ps" : "sh";
    console.log(
      chalk.yellow(
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
    });

    console.log();
    console.log(chalk.bold.green("✓ Upgrade complete!"));
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
