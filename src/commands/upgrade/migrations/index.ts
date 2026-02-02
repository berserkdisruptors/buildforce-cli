import fs from "fs-extra";
import path from "path";
import YAML from "yaml";

/**
 * Result of a single migration
 */
export interface MigrationResult {
  migrated: boolean;
  skipped: boolean;
  actions: string[];
  errors: string[];
}

/**
 * A context migration definition
 *
 * Migrations are defined by their target version and executed sequentially.
 * The runner determines which migrations to apply based on the current version.
 */
export interface Migration {
  /** Target version this migration produces (e.g., "2.0", "2.1") */
  version: string;
  /** Human-readable description of what this migration does */
  description: string;
  /** Execute the migration */
  execute: (projectPath: string, templateSourceDir: string) => Promise<MigrationResult>;
}

/**
 * Compare two version strings
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);

  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

/**
 * Read the current context version from a project's _index.yaml
 * Returns null if no context folder or _index.yaml exists
 */
export async function getCurrentVersion(projectPath: string): Promise<string | null> {
  const contextPath = path.join(projectPath, ".buildforce", "context");
  const indexPath = path.join(contextPath, "_index.yaml");

  if (!(await fs.pathExists(contextPath))) {
    return null;
  }

  if (!(await fs.pathExists(indexPath))) {
    return null;
  }

  try {
    const content = await fs.readFile(indexPath, "utf8");
    const index = YAML.parse(content);
    return index?.version || "1.0"; // Default to 1.0 if no version field
  } catch {
    return "1.0"; // Assume 1.0 if parse error
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}
