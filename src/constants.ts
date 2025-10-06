import { AIChoice, ScriptTypeChoice } from "./types.js";

export const AI_CHOICES: AIChoice = {
  copilot: "GitHub Copilot",
  claude: "Claude Code",
  gemini: "Gemini CLI",
  cursor: "Cursor",
  qwen: "Qwen Code",
  opencode: "opencode",
  codex: "Codex CLI",
  windsurf: "Windsurf",
  kilocode: "Kilo Code",
  auggie: "Auggie CLI",
  roo: "Roo Code",
};

export const SCRIPT_TYPE_CHOICES: ScriptTypeChoice = {
  sh: "POSIX Shell (bash/zsh)",
  ps: "PowerShell",
};

export const BANNER = `
██████╗ ██╗   ██╗██╗██╗     ██████╗ ███████╗ ██████╗ ██████╗  ██████╗███████╗
██╔══██╗██║   ██║██║██║     ██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝
██████╔╝██║   ██║██║██║     ██║  ██║█████╗  ██║   ██║██████╔╝██║     █████╗
██╔══██╗██║   ██║██║██║     ██║  ██║██╔══╝  ██║   ██║██╔══██╗██║     ██╔══╝
██████╔╝╚██████╔╝██║███████╗██████╔╝██║     ╚██████╔╝██║  ██║╚██████╗███████╗
╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝ ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚══════╝
`;

export const TAGLINE = "BuildForce - Spec-Driven Development Toolkit";

export const AGENT_FOLDER_MAP: Record<string, string> = {
  claude: ".claude/",
  gemini: ".gemini/",
  cursor: ".cursor/",
  qwen: ".qwen/",
  opencode: ".opencode/",
  codex: ".codex/",
  windsurf: ".windsurf/",
  kilocode: ".kilocode/",
  auggie: ".augment/",
  copilot: ".github/",
  roo: ".roo/",
};

export const CLAUDE_LOCAL_PATH = `${process.env.HOME}/.claude/local/claude`;

export const REPO_OWNER = "github";
export const REPO_NAME = "buildforce-cli";
