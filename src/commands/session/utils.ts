import fs from "fs-extra";
import path from "path";

/**
 * Represents metadata for a development session
 */
export interface SessionMetadata {
  id: string;
  name: string;
  status: "draft" | "in-progress" | "completed";
  created: string;
  lastUpdated: string;
}

/**
 * Parse basic YAML fields from spec.yaml without full YAML parser
 * Extracts: id, name, status, created, last_updated
 * @param filePath - Path to spec.yaml file
 * @returns Parsed session metadata or null if parsing fails
 */
function parseSpecYaml(filePath: string): SessionMetadata | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");

    // Extract fields using regex patterns
    const idMatch = content.match(/^id:\s*(.+)$/m);
    const nameMatch = content.match(/^name:\s*["'](.+)["']$/m);
    const statusMatch = content.match(/^status:\s*(.+)$/m);
    const createdMatch = content.match(/^created:\s*["']?(.+?)["']?$/m);
    const lastUpdatedMatch = content.match(/^last_updated:\s*["']?(.+?)["']?$/m);

    if (!idMatch || !nameMatch || !statusMatch) {
      return null;
    }

    const status = statusMatch[1].trim() as SessionMetadata["status"];

    // Validate status is one of the expected values
    if (!["draft", "in-progress", "completed"].includes(status)) {
      return null;
    }

    return {
      id: idMatch[1].trim(),
      name: nameMatch[1].trim(),
      status,
      created: createdMatch ? createdMatch[1].trim() : "",
      lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1].trim() : "",
    };
  } catch {
    return null;
  }
}

/**
 * Get all active sessions (draft or in-progress) from .buildforce/sessions/
 * @param projectPath - Path to the project root directory
 * @returns Array of active session metadata, sorted by last_updated descending
 */
export function getActiveSessions(projectPath: string): SessionMetadata[] {
  const sessionsDir = path.join(projectPath, ".buildforce", "sessions");

  // Check if sessions directory exists
  if (!fs.existsSync(sessionsDir)) {
    return [];
  }

  const sessions: SessionMetadata[] = [];

  try {
    // Read all directories in sessions folder
    const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const specPath = path.join(sessionsDir, entry.name, "spec.yaml");

      // Check if spec.yaml exists
      if (!fs.existsSync(specPath)) {
        continue;
      }

      // Parse spec.yaml
      const metadata = parseSpecYaml(specPath);

      if (!metadata) {
        continue;
      }

      // Filter for active sessions only (draft or in-progress)
      if (metadata.status === "draft" || metadata.status === "in-progress") {
        sessions.push(metadata);
      }
    }

    // Sort by last_updated descending (most recent first)
    sessions.sort((a, b) => {
      if (a.lastUpdated > b.lastUpdated) return -1;
      if (a.lastUpdated < b.lastUpdated) return 1;
      return 0;
    });

    return sessions;
  } catch {
    return [];
  }
}
