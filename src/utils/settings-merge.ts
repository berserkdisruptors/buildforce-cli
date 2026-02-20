import fs from "fs-extra";
import { chmodSync, statSync } from "fs";
import path from "path";
import chalk from "chalk";

/**
 * Result of merging agent settings
 */
export interface MergeResult {
  merged: boolean;
  skipped: boolean;
  reason: string;
  hooksAdded?: number;
  permissionsAdded?: number;
}

/**
 * Claude Code hooks configuration (the content of the hooks object)
 */
interface HooksConfig {
  Stop?: unknown[];
  PreToolUse?: unknown[];
  PostToolUse?: unknown[];
  [key: string]: unknown[] | undefined;
}

/**
 * Agent settings structure
 */
interface AgentSettings {
  version?: number;
  permissions?: {
    allow?: string[];
    deny?: string[];
    ask?: string[];
  };
  hooks?: HooksConfig;
  [key: string]: unknown;
}

/**
 * Claude hooks configuration.
 * PreToolUse hook for Task tool redirection (Explore → buildforce-explorer).
 */
const CLAUDE_HOOKS_CONFIG: HooksConfig = {
  PreToolUse: [
    {
      matcher: "Task",
      hooks: [
        {
          type: "command",
          command: ".claude/hooks/setup-explorer-subagent.sh",
        },
      ],
    },
  ],
};

/**
 * Cursor hooks configuration.
 * preToolUse hook for Task tool redirection (explore → buildforce-explorer).
 */
const CURSOR_HOOKS_CONFIG = {
  version: 1,
  hooks: {
    preToolUse: [
      {
        matcher: "Task",
        command: ".cursor/hooks/setup-explorer-subagent.sh",
      },
    ],
  },
};

/**
 * Deep merge two arrays, removing duplicates based on JSON.stringify comparison
 */
export function mergeArraysUnique<T>(existing: T[], incoming: T[]): T[] {
  const result = [...existing];
  const existingStrings = new Set(existing.map((item) => JSON.stringify(item)));

  for (const item of incoming) {
    const itemString = JSON.stringify(item);
    if (!existingStrings.has(itemString)) {
      result.push(item);
      existingStrings.add(itemString);
    }
  }

  return result;
}

/**
 * Deep merge agent settings objects (additive only - never removes existing data)
 * - Arrays are merged with deduplication
 * - Objects are merged recursively
 * - Existing values are preserved
 */
export function mergeSettings(
  existing: AgentSettings,
  incoming: AgentSettings
): AgentSettings {
  const result: AgentSettings = { ...existing };

  // Merge version (incoming takes precedence)
  if (incoming.version !== undefined) {
    result.version = incoming.version;
  }

  // Merge permissions
  if (incoming.permissions) {
    result.permissions = result.permissions || {};

    if (incoming.permissions.allow) {
      result.permissions.allow = mergeArraysUnique(
        result.permissions.allow || [],
        incoming.permissions.allow
      );
    }

    if (incoming.permissions.deny) {
      result.permissions.deny = mergeArraysUnique(
        result.permissions.deny || [],
        incoming.permissions.deny
      );
    }

    if (incoming.permissions.ask) {
      result.permissions.ask = mergeArraysUnique(
        result.permissions.ask || [],
        incoming.permissions.ask
      );
    }
  }

  // Merge hooks
  if (incoming.hooks) {
    result.hooks = result.hooks || {};

    for (const [hookType, hookArray] of Object.entries(incoming.hooks)) {
      if (Array.isArray(hookArray)) {
        result.hooks[hookType] = mergeArraysUnique(
          (result.hooks[hookType] as unknown[]) || [],
          hookArray
        );
      }
    }
  }

  return result;
}

/**
 * Ensure all .sh files in the hooks directory have executable permissions.
 * ZIP extraction and fs.copy don't preserve execute bits.
 */
async function ensureHooksExecutable(hooksDir: string): Promise<void> {
  if (process.platform === "win32") return;
  if (!(await fs.pathExists(hooksDir))) return;

  const entries = await fs.readdir(hooksDir);
  for (const entry of entries) {
    if (!entry.endsWith(".sh")) continue;
    const fullPath = path.join(hooksDir, entry);
    try {
      const stats = statSync(fullPath);
      if (!(stats.mode & 0o111)) {
        chmodSync(fullPath, stats.mode | 0o755);
      }
    } catch {
      // Skip files we can't stat/chmod
    }
  }
}

/**
 * Merge a JSON settings file with incoming config using additive merge.
 * Shared by Claude and Cursor strategies.
 */
async function mergeJsonSettingsFile(
  settingsPath: string,
  incomingSettings: AgentSettings,
  debug: boolean
): Promise<{ settingsExisted: boolean }> {
  let existingSettings: AgentSettings = {};
  let settingsExisted = false;

  if (await fs.pathExists(settingsPath)) {
    settingsExisted = true;
    try {
      const existingContent = await fs.readFile(settingsPath, "utf8");
      existingSettings = JSON.parse(existingContent);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (debug) {
        console.log(
          chalk.yellow(
            `[settings-merge] Failed to parse existing settings, starting fresh: ${errorMessage}`
          )
        );
      }
      existingSettings = {};
    }
  }

  const mergedSettings = mergeSettings(existingSettings, incomingSettings);

  await fs.writeFile(
    settingsPath,
    JSON.stringify(mergedSettings, null, 2) + "\n",
    "utf8"
  );

  if (debug) {
    console.log(chalk.gray(`[settings-merge] Wrote merged settings to: ${settingsPath}`));
  }

  return { settingsExisted };
}

/**
 * Claude Code: merge hooks into .claude/settings.local.json
 */
async function mergeClaudeSettings(
  projectPath: string,
  debug: boolean
): Promise<MergeResult> {
  const agentDir = path.join(projectPath, ".claude");
  await fs.ensureDir(agentDir);

  const settingsPath = path.join(agentDir, "settings.local.json");
  const { settingsExisted } = await mergeJsonSettingsFile(
    settingsPath,
    { hooks: CLAUDE_HOOKS_CONFIG },
    debug
  );

  const hooksAdded = Object.values(CLAUDE_HOOKS_CONFIG).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  if (debug) {
    console.log(chalk.gray(`[settings-merge] Claude hooks entries: ${hooksAdded}`));
  }

  await ensureHooksExecutable(path.join(agentDir, "hooks"));

  return {
    merged: true,
    skipped: false,
    reason: settingsExisted ? "merged with existing" : "created new",
    hooksAdded,
  };
}

/**
 * Cursor: merge hooks into .cursor/hooks.json
 */
async function mergeCursorSettings(
  projectPath: string,
  debug: boolean
): Promise<MergeResult> {
  const agentDir = path.join(projectPath, ".cursor");
  await fs.ensureDir(agentDir);

  const settingsPath = path.join(agentDir, "hooks.json");
  const { settingsExisted } = await mergeJsonSettingsFile(
    settingsPath,
    CURSOR_HOOKS_CONFIG,
    debug
  );

  const hooksAdded = CURSOR_HOOKS_CONFIG.hooks.preToolUse.length;

  if (debug) {
    console.log(chalk.gray(`[settings-merge] Cursor hooks entries: ${hooksAdded}`));
  }

  await ensureHooksExecutable(path.join(agentDir, "hooks"));

  return {
    merged: true,
    skipped: false,
    reason: settingsExisted ? "merged with existing" : "created new",
    hooksAdded,
  };
}

/**
 * OpenCode: write plugin file to .opencode/plugins/
 */
async function mergeOpenCodeSettings(
  projectPath: string,
  debug: boolean
): Promise<MergeResult> {
  const pluginsDir = path.join(projectPath, ".opencode", "plugins");
  await fs.ensureDir(pluginsDir);

  const pluginPath = path.join(pluginsDir, "buildforce-explorer-redirect.ts");
  const pluginContent = `export default async ({ project, client, $, directory, worktree }) => {
  return {
    tool: {
      execute: {
        before: (input, output) => {
          if (input.tool === "task" && output.args?.subagent_type === "Explore") {
            output.args.subagent_type = "buildforce-explorer";
          }
        },
      },
    },
  };
};
`;

  const existed = await fs.pathExists(pluginPath);
  await fs.writeFile(pluginPath, pluginContent, "utf8");

  if (debug) {
    console.log(chalk.gray(`[settings-merge] Wrote OpenCode plugin to: ${pluginPath}`));
  }

  return {
    merged: true,
    skipped: false,
    reason: existed ? "replaced existing plugin" : "created new plugin",
    hooksAdded: 1,
  };
}

/**
 * Merge Buildforce agent settings for the given agent.
 * Dispatches to agent-specific merge strategy.
 *
 * @param projectPath - Root path of the project
 * @param agentFolder - Agent folder (e.g. ".claude/") from AGENT_FOLDER_MAP
 * @param options - Merge options
 * @returns MergeResult indicating what was done
 */
export async function mergeAgentSettings(
  projectPath: string,
  agentFolder: string,
  options: { debug?: boolean } = {}
): Promise<MergeResult> {
  const { debug = false } = options;

  switch (agentFolder) {
    case ".claude/":
      return mergeClaudeSettings(projectPath, debug);
    case ".cursor/":
      return mergeCursorSettings(projectPath, debug);
    case ".opencode/":
      return mergeOpenCodeSettings(projectPath, debug);
    default:
      return {
        merged: false,
        skipped: true,
        reason: "unknown agent",
      };
  }
}
