import chalk from "chalk";

// Re-export agent configurations
export {
  AI_CHOICES,
  SCRIPT_TYPE_CHOICES,
  AGENT_FOLDER_MAP,
} from "./config/agents.js";

export const TAGLINE = "Context-first Spec-Driven Development framework";

// Centralized green color for cohesive UI
export const MINT_COLOR = chalk.hex("#D3FFCA");

// Centralized green color for success indicators
export const GREEN_COLOR = chalk.hex("#D3FFCA");

export const CLAUDE_LOCAL_PATH = `${process.env.HOME}/.claude/local/claude`;

export const REPO_OWNER = "berserkdisruptors";
export const REPO_NAME = "buildforce-cli";
