import fs from "fs-extra";
import { chmodSync, statSync } from "fs";
import path from "path";

/**
 * Hook entry for the Buildforce Explore-to-ContextSearcher redirect.
 * Matches Task tool calls and rewrites Explore subagent_type to
 * buildforce-explorer so queries go through the context repository.
 */
const BUILDFORCE_HOOKS_CONFIG = {
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
 * Check if a hook entry already exists in a hooks array by matching
 * the command path of the first hook in each entry.
 */
function hookEntryExists(
  existing: any[],
  entry: { matcher: string; hooks: { command: string }[] }
): boolean {
  const targetCommand = entry.hooks?.[0]?.command;
  if (!targetCommand) return false;

  return existing.some(
    (e: any) => e.hooks?.[0]?.command === targetCommand
  );
}

/**
 * Merge Buildforce hook configuration into .claude/settings.local.json.
 * This is idempotent — calling it multiple times won't duplicate entries.
 *
 * @param projectPath - Root of the project
 * @param agentFolder - The agent folder (e.g. ".claude/") — hooks only apply to Claude
 */
export async function mergeHooksSettings(
  projectPath: string,
  agentFolder: string
): Promise<{ updated: boolean; created: boolean }> {
  // Hooks only apply to Claude Code
  if (agentFolder !== ".claude/") {
    return { updated: false, created: false };
  }

  const settingsPath = path.join(projectPath, ".claude", "settings.local.json");

  let settings: any = {};
  let fileExisted = false;

  // Read existing settings if present
  if (await fs.pathExists(settingsPath)) {
    fileExisted = true;
    try {
      const content = await fs.readFile(settingsPath, "utf8");
      settings = JSON.parse(content);
    } catch {
      // Malformed JSON — start fresh but preserve the file
      settings = {};
    }
  }

  // Ensure hooks object exists
  if (!settings.hooks) {
    settings.hooks = {};
  }

  let modified = false;

  // Merge each hook event type
  for (const [eventName, entries] of Object.entries(BUILDFORCE_HOOKS_CONFIG)) {
    if (!settings.hooks[eventName]) {
      settings.hooks[eventName] = [];
    }

    for (const entry of entries as any[]) {
      if (!hookEntryExists(settings.hooks[eventName], entry)) {
        settings.hooks[eventName].push(entry);
        modified = true;
      }
    }
  }

  if (modified) {
    await fs.ensureDir(path.dirname(settingsPath));
    await fs.writeFile(
      settingsPath,
      JSON.stringify(settings, null, 2) + "\n",
      "utf8"
    );
  }

  // Ensure hook scripts are executable
  await ensureHooksExecutable(path.join(projectPath, ".claude", "hooks"));

  return { updated: modified, created: !fileExisted && modified };
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
