import chalk from "chalk";
import { showBanner } from "../lib/interactive.js";
import { TAGLINE, GREEN_COLOR } from "../constants.js";
import { checkTool } from "../utils/index.js";
import { StepTracker } from "../lib/step-tracker.js";

/**
 * Check if a tool is installed and update tracker
 */
function checkToolForTracker(tool: string, tracker: StepTracker): boolean {
  if (checkTool(tool)) {
    tracker.complete(tool, "available");
    return true;
  } else {
    tracker.error(tool, "not found");
    return false;
  }
}

/**
 * Check that all required tools are installed
 */
export function checkCommand(): void {
  showBanner("", TAGLINE);
  console.log(chalk.bold("Checking for installed tools..."));
  console.log();

  const tracker = new StepTracker("Check Available Tools");

  tracker.add("git", "Git version control");
  tracker.add("claude", "Claude Code CLI");
  tracker.add("cursor-agent", "Cursor IDE agent");
  tracker.add("opencode", "opencode");

  const gitOk = checkToolForTracker("git", tracker);
  const claudeOk = checkToolForTracker("claude", tracker);
  const cursorOk = checkToolForTracker("cursor-agent", tracker);
  const opencodeOk = checkToolForTracker("opencode", tracker);

  console.log(tracker.render());
  console.log();

  console.log(GREEN_COLOR.bold("Buildforce CLI is ready to use!"));
  console.log();

  if (!gitOk) {
    console.log(chalk.dim("Tip: Install git for repository management"));
  }

  if (!claudeOk && !cursorOk && !opencodeOk) {
    console.log(
      chalk.dim("Tip: Install an AI assistant for the best experience")
    );
  }
}
