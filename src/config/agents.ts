import { AIChoice } from "../types.js";

export const AI_CHOICES: AIChoice = {
  claude: "Claude Code",
  cursor: "Cursor",
  opencode: "opencode",
};

export const AGENT_FOLDER_MAP: Record<string, string> = {
  claude: ".claude/",
  cursor: ".cursor/",
  opencode: ".opencode/",
};
