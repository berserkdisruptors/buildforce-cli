import fs from "fs-extra";
import path from "path";
import chalk from "chalk";

/**
 * Result of merging Claude settings
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
 * Claude Code settings structure
 */
interface ClaudeSettings {
  permissions?: {
    allow?: string[];
    deny?: string[];
    ask?: string[];
  };
  hooks?: HooksConfig;
  [key: string]: unknown;
}

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
 * Deep merge Claude settings objects (additive only - never removes existing data)
 * - Arrays are merged with deduplication
 * - Objects are merged recursively
 * - Existing values are preserved
 */
function mergeSettings(
  existing: ClaudeSettings,
  incoming: ClaudeSettings
): ClaudeSettings {
  const result: ClaudeSettings = { ...existing };

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
 * Merge Claude Code settings from template config into user's settings.local.json
 *
 * @param projectPath - Root path of the project
 * @param templateConfigPath - Path to template hooks/config.json (relative to projectPath)
 * @param options - Merge options
 * @returns MergeResult indicating what was done
 */
export async function mergeClaudeSettings(
  projectPath: string,
  templateConfigPath: string,
  options: { debug?: boolean } = {}
): Promise<MergeResult> {
  const { debug = false } = options;

  const fullTemplatePath = path.join(projectPath, templateConfigPath);
  const settingsPath = path.join(projectPath, ".claude", "settings.local.json");

  // Check if template config exists
  if (!(await fs.pathExists(fullTemplatePath))) {
    if (debug) {
      console.log(
        chalk.gray(`[settings-merge] Template config not found: ${fullTemplatePath}`)
      );
    }
    return {
      merged: false,
      skipped: true,
      reason: "no template config",
    };
  }

  // Read template config
  // The template config.json contains hooks configuration directly (e.g., { "Stop": [...] })
  // not the full settings structure. We wrap it in a settings object for merging.
  let templateHooks: HooksConfig;
  try {
    const templateContent = await fs.readFile(fullTemplatePath, "utf8");
    templateHooks = JSON.parse(templateContent);
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    if (debug) {
      console.log(
        chalk.yellow(`[settings-merge] Failed to parse template config: ${errorMessage}`)
      );
    }
    return {
      merged: false,
      skipped: true,
      reason: `invalid template JSON: ${errorMessage}`,
    };
  }

  // Wrap the hooks config in a full settings structure for merging
  const templateConfig: ClaudeSettings = {
    hooks: templateHooks,
  };

  // Ensure .claude directory exists
  const claudeDir = path.join(projectPath, ".claude");
  await fs.ensureDir(claudeDir);

  // Read existing settings if they exist
  let existingSettings: ClaudeSettings = {};
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

  // Merge settings
  const mergedSettings = mergeSettings(existingSettings, templateConfig);

  // Count what was added
  const hooksAdded = templateConfig.hooks
    ? Object.values(templateConfig.hooks).reduce(
        (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
        0
      )
    : 0;

  const permissionsAdded =
    (templateConfig.permissions?.allow?.length || 0) +
    (templateConfig.permissions?.deny?.length || 0) +
    (templateConfig.permissions?.ask?.length || 0);

  // Write merged settings
  await fs.writeFile(
    settingsPath,
    JSON.stringify(mergedSettings, null, 2) + "\n",
    "utf8"
  );

  if (debug) {
    console.log(chalk.gray(`[settings-merge] Wrote merged settings to: ${settingsPath}`));
    console.log(chalk.gray(`[settings-merge] Hooks entries: ${hooksAdded}, Permissions entries: ${permissionsAdded}`));
  }

  return {
    merged: true,
    skipped: false,
    reason: settingsExisted ? "merged with existing" : "created new",
    hooksAdded,
    permissionsAdded,
  };
}
