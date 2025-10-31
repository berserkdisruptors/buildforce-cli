import { glob } from "glob";
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { MINT_COLOR } from "../constants.js";

interface LocalArtifactResult {
  zipPath: string;
  version: string;
}

/**
 * Resolves a local artifact from the specified directory
 * @param localDir - Directory to search for artifacts (e.g., .genreleases)
 * @param aiAssistant - AI assistant type (claude, gemini, etc.)
 * @param scriptType - Script type (sh or ps)
 * @returns Promise with zipPath and version
 * @throws Error if artifact not found or invalid
 */
export async function resolveLocalArtifact(
  localDir: string,
  aiAssistant: string,
  scriptType: string
): Promise<LocalArtifactResult> {
  // Resolve the local directory to an absolute path
  const absoluteLocalDir = path.resolve(localDir);

  // Check if the directory exists
  if (!fs.existsSync(absoluteLocalDir)) {
    throw new Error(
      chalk.red(
        `Local artifacts directory not found: ${absoluteLocalDir}\n\n` +
          `Please create the directory or run the artifact generation script:\n` +
          MINT_COLOR(
            `AGENTS=${aiAssistant} SCRIPTS=${scriptType} .github/workflows/scripts/create-release-packages.sh v0.0.99`
          )
      )
    );
  }

  // Build the glob pattern for matching artifacts
  const pattern = `buildforce-cli-template-${aiAssistant}-${scriptType}-v*.zip`;
  const fullPattern = path.join(absoluteLocalDir, pattern);

  // Find all matching artifacts
  const matches = await glob(fullPattern);

  if (matches.length === 0) {
    // List available artifacts to help user
    const allArtifacts = await glob(
      path.join(absoluteLocalDir, "buildforce-cli-template-*.zip")
    );
    const availableList =
      allArtifacts.length > 0
        ? `\n\nAvailable artifacts in ${localDir}:\n` +
          allArtifacts
            .map((a) => `  - ${path.basename(a)}`)
            .join("\n")
        : `\n\nNo artifacts found in ${localDir}. The directory is empty.`;

    throw new Error(
      chalk.red(
        `Local artifact not found.\n\n` +
          `Expected pattern: ${MINT_COLOR(pattern)}\n` +
          `Searched in: ${absoluteLocalDir}${availableList}\n\n` +
          `To generate the required artifact, run:\n` +
          MINT_COLOR(
            `AGENTS=${aiAssistant} SCRIPTS=${scriptType} .github/workflows/scripts/create-release-packages.sh v0.0.99`
          )
      )
    );
  }

  // If multiple matches, select the latest version (alphabetically)
  // This works because version format v0.0.99 sorts correctly
  const sortedMatches = matches.sort().reverse();
  const selectedArtifact = sortedMatches[0];

  // Validate the artifact exists and is not empty
  const stats = await fs.stat(selectedArtifact);
  if (stats.size === 0) {
    throw new Error(
      chalk.red(
        `Local artifact is empty: ${selectedArtifact}\n\n` +
          `Please regenerate the artifact using create-release-packages.sh`
      )
    );
  }

  // Extract version from filename using regex
  const filename = path.basename(selectedArtifact);
  const versionMatch = filename.match(
    /buildforce-cli-template-.*-(v\d+\.\d+\.\d+)\.zip$/
  );

  if (!versionMatch) {
    throw new Error(
      chalk.red(
        `Invalid artifact filename format: ${filename}\n\n` +
          `Expected format: buildforce-cli-template-{agent}-{script}-{version}.zip`
      )
    );
  }

  const version = versionMatch[1];

  // Notify user if multiple matches were found
  if (sortedMatches.length > 1) {
    console.log(
      MINT_COLOR(
        `⚠️  Found ${sortedMatches.length} matching artifacts. Using latest: ${path.basename(selectedArtifact)}`
      )
    );
  }

  return {
    zipPath: selectedArtifact,
    version: version,
  };
}
