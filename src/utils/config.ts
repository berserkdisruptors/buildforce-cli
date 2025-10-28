import fs from "fs-extra";
import path from "path";
import { BuildforceConfig } from "../types.js";

/**
 * Get the default Buildforce configuration
 */
export function getDefaultConfig(): BuildforceConfig {
  return {
    specsFolder: "./specs",
    framework: "buildforce",
  };
}

/**
 * Create a buildforce.json config file content
 * @param aiAssistant - Optional AI assistant name
 * @param scriptType - Optional script type (sh or ps)
 * @param version - Optional CLI version
 */
export function createConfigContent(
  aiAssistant?: string,
  scriptType?: string,
  version?: string
): string {
  const config: BuildforceConfig = {
    ...getDefaultConfig(),
    ...(aiAssistant && { aiAssistant }),
    ...(scriptType && { scriptType }),
    ...(version && { version }),
  };
  return JSON.stringify(config, null, 2) + "\n";
}

/**
 * Read buildforce.json configuration file
 * @param projectPath - Path to the project directory
 * @returns Parsed configuration or null if file doesn't exist or is malformed
 */
export function readBuildforceConfig(
  projectPath: string
): BuildforceConfig | null {
  const configPath = path.join(projectPath, ".buildforce", "buildforce.json");

  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const configContent = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configContent) as BuildforceConfig;
    return config;
  } catch (error) {
    // Return null for malformed JSON or read errors
    return null;
  }
}

/**
 * Save buildforce.json configuration file
 * Merges new fields with existing config to preserve other settings
 * @param projectPath - Path to the project directory
 * @param updates - Partial configuration to merge
 */
export function saveBuildforceConfig(
  projectPath: string,
  updates: Partial<BuildforceConfig>
): void {
  const configPath = path.join(projectPath, ".buildforce", "buildforce.json");

  // Read existing config or use default
  let existingConfig: BuildforceConfig;
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      existingConfig = JSON.parse(content);
    } else {
      existingConfig = getDefaultConfig();
    }
  } catch {
    existingConfig = getDefaultConfig();
  }

  // Merge updates with existing config
  const mergedConfig = {
    ...existingConfig,
    ...updates,
  };

  // Write back to file
  fs.writeFileSync(
    configPath,
    JSON.stringify(mergedConfig, null, 2) + "\n",
    "utf-8"
  );
}
