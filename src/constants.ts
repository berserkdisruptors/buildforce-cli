// Re-export agent configurations
export {
  AI_CHOICES,
  SCRIPT_TYPE_CHOICES,
  AGENT_FOLDER_MAP,
} from "./config/agents.js";

export const BANNER = `
██████╗ ██╗   ██╗██╗██╗     ██████╗ ███████╗ ██████╗ ██████╗  ██████╗███████╗
██╔══██╗██║   ██║██║██║     ██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝
██████╔╝██║   ██║██║██║     ██║  ██║█████╗  ██║   ██║██████╔╝██║     █████╗
██╔══██╗██║   ██║██║██║     ██║  ██║██╔══╝  ██║   ██║██╔══██╗██║     ██╔══╝
██████╔╝╚██████╔╝██║███████╗██████╔╝██║     ╚██████╔╝██║  ██║╚██████╗███████╗
╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝ ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚══════╝
`;

export const TAGLINE = "Context-first Spec-Driven Development framework";

export const CLAUDE_LOCAL_PATH = `${process.env.HOME}/.claude/local/claude`;

export const REPO_OWNER = "berserkdisruptors";
export const REPO_NAME = "buildforce-cli";
