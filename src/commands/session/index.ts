import { select } from "@inquirer/prompts";
import chalk from "chalk";
import logSymbols from "log-symbols";
import path from "path";
import fs from "fs-extra";
import { readBuildforceConfig, saveBuildforceConfig } from "../../utils/config.js";
import { GREEN_COLOR, INQUIRER_THEME } from "../../constants.js";
import { getActiveSessions, SessionMetadata } from "./utils.js";

/**
 * Session management command - interactive picker for switching between active sessions
 * Displays all draft and in-progress sessions with arrow key navigation
 */
export async function sessionCommand(): Promise<void> {
  const projectPath = process.cwd();

  // Check if buildforce.json exists
  const config = readBuildforceConfig(projectPath);
  if (!config) {
    console.error(
      chalk.red(
        `${logSymbols.error} Not in a buildforce project. Run 'buildforce init' first.`
      )
    );
    process.exit(1);
  }

  // Get active sessions
  const sessions = getActiveSessions(projectPath);

  if (sessions.length === 0) {
    console.log(
      chalk.yellow(
        `${logSymbols.info} No active sessions found. Run /buildforce.plan to create one.`
      )
    );
    return;
  }

  // Get current session from config
  const currentSession = config.currentSession || null;

  // Build choices for inquirer
  const choices = sessions.map((session: SessionMetadata) => {
    const isActive = session.id === currentSession;
    const activeMarker = isActive ? GREEN_COLOR("● ") : "  ";
    const statusBadge =
      session.status === "in-progress"
        ? chalk.yellow("[in-progress]")
        : chalk.dim("[draft]");

    return {
      name: `${activeMarker}${session.name} ${statusBadge}`,
      value: session.id,
      description: `Created: ${session.created} | Updated: ${session.lastUpdated}`,
    };
  });

  // Display interactive picker
  try {
    const selectedSessionId = await select({
      message: "Select a session to switch to:",
      choices,
      theme: INQUIRER_THEME,
    });

    // Check if user selected the already active session
    if (selectedSessionId === currentSession) {
      console.log(
        chalk.dim(`${logSymbols.info} Already on session: ${selectedSessionId}`)
      );
      return;
    }

    // Validate session folder exists
    const sessionPath = path.join(
      projectPath,
      ".buildforce",
      "sessions",
      selectedSessionId
    );
    if (!fs.existsSync(sessionPath)) {
      console.error(
        chalk.red(
          `${logSymbols.error} Session folder not found: ${selectedSessionId}`
        )
      );
      process.exit(1);
    }

    // Update buildforce.json with new currentSession
    saveBuildforceConfig(projectPath, {
      currentSession: selectedSessionId
    });

    // Display success message
    console.log(
      GREEN_COLOR(`${logSymbols.success} Switched to session: ${selectedSessionId}`)
    );
  } catch (error: any) {
    // Handle Ctrl+C or other interruptions gracefully
    if (error.name === "ExitPromptError") {
      console.log(chalk.dim("\nSession switch cancelled."));
      return;
    }
    throw error;
  }
}
