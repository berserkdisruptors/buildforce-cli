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
  permissions?: {
    allow?: string[];
    deny?: string[];
    ask?: string[];
  };
  hooks?: HooksConfig;
  [key: string]: unknown;
}

/**
 * Buildforce hooks configuration.
 * Source of truth: src/templates/hooks/config.json
 *
 * PreToolUse hook for Task tool redirection (Explore → buildforce-explorer).
 */
const BUILDFORCE_HOOKS_CONFIG: HooksConfig = {
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
 * Deep merge two arrays, removing duplicates based on JSON.stringify comparison
 */
function mergeArraysUnique<T>(existing: T[], incoming: T[]): T[] {
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
function mergeSettings(
  existing: AgentSettings,
  incoming: AgentSettings
): AgentSettings {
  const result: AgentSettings = { ...existing };

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
 * Merge Buildforce agent settings into the user's settings.local.json.
 * For Claude agents, merges the Buildforce hooks configuration and ensures
 * hook scripts are executable.
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

  // Currently hooks are Claude-only — skip for other agents
  if (agentFolder !== ".claude/") {
    return {
      merged: false,
      skipped: true,
      reason: "hooks not applicable for this agent",
    };
  }

  const settingsPath = path.join(projectPath, agentFolder, "settings.local.json");

  // Ensure agent directory exists
  const agentDir = path.join(projectPath, agentFolder);
  await fs.ensureDir(agentDir);

  // Read existing settings if they exist
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

  // Merge Buildforce hooks config into existing settings
  const mergedSettings = mergeSettings(existingSettings, { hooks: BUILDFORCE_HOOKS_CONFIG });

  // Count hooks added
  const hooksAdded = Object.values(BUILDFORCE_HOOKS_CONFIG).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  // Write merged settings
  await fs.writeFile(
    settingsPath,
    JSON.stringify(mergedSettings, null, 2) + "\n",
    "utf8"
  );

  if (debug) {
    console.log(chalk.gray(`[settings-merge] Wrote merged settings to: ${settingsPath}`));
    console.log(chalk.gray(`[settings-merge] Hooks entries: ${hooksAdded}`));
  }

  // Ensure hook scripts are executable
  await ensureHooksExecutable(path.join(projectPath, agentFolder, "hooks"));

  return {
    merged: true,
    skipped: false,
    reason: settingsExisted ? "merged with existing" : "created new",
    hooksAdded,
  };
}
