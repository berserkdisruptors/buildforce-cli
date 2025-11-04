import chalk from "chalk";
import {
  AI_CHOICES,
  SCRIPT_TYPE_CHOICES,
  TAGLINE,
  AGENT_FOLDER_MAP,
  MINT_COLOR,
  GREEN_COLOR,
} from "../../constants.js";
import { InitOptions } from "../../types.js";
import { checkTool } from "../../utils/index.js";
import { showBanner, selectWithArrows } from "../../lib/interactive.js";
import {
  validateProjectSetup,
  validateAiAssistant,
  validateScriptType,
  checkAgentTool,
} from "./validation.js";
import { setupProject, handleSetupError } from "./setup.js";
import {
  displaySetupInfo,
  displayAgentSecurityNotice,
  displayNextSteps,
} from "./output.js";

/**
 * Initialize a new Buildforce CLI project from the latest template
 */
export async function initCommand(options: InitOptions): Promise<void> {
  // Show banner first
  showBanner("", TAGLINE);

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
    local,
  } = options;

  // Validate and setup project structure
  const { projectName, projectPath, isHere } = await validateProjectSetup(
    inputProjectName,
    here,
    force
  );

  // Display setup information
  displaySetupInfo(projectName, projectPath, isHere);

  // Check git only if we might need it (not --no-git)
  let shouldInitGit = false;
  if (!noGit) {
    shouldInitGit = checkTool("git");
    if (!shouldInitGit) {
      console.log(
        MINT_COLOR("Git not found - will skip repository initialization")
      );
    }
  }

  // AI assistant selection
  let selectedAi: string;
  if (inputAiAssistant) {
    validateAiAssistant(inputAiAssistant, AI_CHOICES);
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
    checkAgentTool(selectedAi, AI_CHOICES, checkTool);
  }

  // Determine script type
  let selectedScript: string;
  if (inputScriptType) {
    validateScriptType(inputScriptType, SCRIPT_TYPE_CHOICES);
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

  console.log(MINT_COLOR("Selected AI assistant:"), selectedAi);
  console.log(MINT_COLOR("Selected script type:"), selectedScript);
  console.log();

  // Execute project setup
  try {
    await setupProject(projectPath, selectedAi, selectedScript, isHere, {
      debug,
      githubToken,
      skipTls,
      noGit,
      shouldInitGit,
      local,
    });

    console.log();
    console.log(GREEN_COLOR.bold("Buildforce is initialized."));

    // Display post-setup information
    // displayAgentSecurityNotice(selectedAi, AGENT_FOLDER_MAP);
    displayNextSteps(projectName, projectPath, selectedAi, isHere);
  } catch (e: any) {
    await handleSetupError(e, projectPath, isHere, debug);
  }
}
