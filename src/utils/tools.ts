import { existsSync, statSync } from "fs";
import which from "which";
import { CLAUDE_LOCAL_PATH } from "../constants.js";

/**
 * Check if a tool is installed in PATH
 */
export function checkTool(tool: string): boolean {
  // Special handling for Claude CLI after migrate-installer
  if (tool === "claude") {
    if (existsSync(CLAUDE_LOCAL_PATH)) {
      try {
        const stats = statSync(CLAUDE_LOCAL_PATH);
        if (stats.isFile()) {
          return true;
        }
      } catch (e) {
        // Fall through to regular check
      }
    }
  }

  try {
    which.sync(tool);
    return true;
  } catch (e) {
    return false;
  }
}
