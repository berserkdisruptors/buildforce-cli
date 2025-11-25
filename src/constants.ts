import chalk from "chalk";

// Re-export agent configurations
export {
  AI_CHOICES,
  SCRIPT_TYPE_CHOICES,
  AGENT_FOLDER_MAP,
} from "./config/agents.js";

export const TAGLINE = "Consistent, reliable and efficient framework for AI-assisted engineering";

// Centralized green color for cohesive UI
export const MINT_COLOR = chalk.hex("#D3FFCA");

// Centralized green color for success indicators
export const GREEN_COLOR = chalk.hex("#D3FFCA");

/**
 * Custom inquirer theme matching Buildforce brand colors
 * Uses mint green (#D3FFCA) for active selections and answers
 */
export const INQUIRER_THEME = {
  prefix: MINT_COLOR("?"),
  style: {
    answer: chalk.hex("#D3FFCA"), // Final answer color (mint green)
    message: chalk.white, // Question text (white)
    highlight: chalk.hex("#D3FFCA"), // Active selection (mint green)
    help: chalk.dim, // Help text (dimmed)
    error: chalk.red, // Error messages (red)
  },
};

export const CLAUDE_LOCAL_PATH = `${process.env.HOME}/.claude/local/claude`;

export const REPO_OWNER = "berserkdisruptors";
export const REPO_NAME = "buildforce-cli";
