import fs from "fs-extra";
import path from "path";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Validate prerequisites for upgrade command
 * - .buildforce/buildforce.json must exist
 * - .buildforce/ directory must exist
 * - buildforce.json must be valid JSON
 */
export function validateUpgradePrerequisites(
  projectPath: string
): ValidationResult {
  // Check if .buildforce/ directory exists
  const buildforceDir = path.join(projectPath, ".buildforce");
  if (!fs.existsSync(buildforceDir)) {
    return {
      valid: false,
      error: ".buildforce/ directory not found",
      suggestion:
        "This doesn't appear to be a Buildforce project. Run 'buildforce init .' to initialize.",
    };
  }

  // Check if buildforce.json exists
  const configPath = path.join(projectPath, ".buildforce", "buildforce.json");
  if (!fs.existsSync(configPath)) {
    return {
      valid: false,
      error: ".buildforce/buildforce.json not found",
      suggestion:
        "Configuration file is missing. Run 'buildforce init .' to reinitialize this directory.",
    };
  }

  // Check if buildforce.json is valid JSON
  try {
    const configContent = fs.readFileSync(configPath, "utf-8");
    JSON.parse(configContent);
  } catch (e) {
    return {
      valid: false,
      error: ".buildforce/buildforce.json is not valid JSON",
      suggestion:
        "Check the file for syntax errors or restore from git history.",
    };
  }

  return { valid: true };
}
