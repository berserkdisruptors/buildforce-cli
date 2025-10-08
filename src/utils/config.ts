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
 */
export function createConfigContent(): string {
  const config = getDefaultConfig();
  return JSON.stringify(config, null, 2) + "\n";
}
