import fs from "fs-extra";
import path from "path";
import AdmZip from "adm-zip";
import chalk from "chalk";
import os from "os";
import { downloadTemplateFromGithub } from "./github.js";
import { StepTracker } from "./step-tracker.js";

/**
 * Download and extract template to create a new project
 */
export async function downloadAndExtractTemplate(
  projectPath: string,
  aiAssistant: string,
  scriptType: string,
  isCurrentDir: boolean = false,
  options: {
    verbose?: boolean;
    tracker?: StepTracker;
    debug?: boolean;
    githubToken?: string;
    skipTls?: boolean;
    localZipPath?: string;
  } = {}
): Promise<{ projectPath: string; version: string }> {
  const {
    verbose = true,
    tracker,
    debug = false,
    githubToken,
    skipTls = false,
    localZipPath,
  } = options;

  const currentDir = process.cwd();

  // Step: fetch + download combined
  if (tracker) {
    tracker.start("fetch", "contacting GitHub API");
  }

  let zipPath: string;
  let meta: any;

  try {
    const result = await downloadTemplateFromGithub(aiAssistant, currentDir, {
      scriptType,
      verbose: verbose && !tracker,
      showProgress: !tracker,
      debug,
      githubToken,
      skipTls,
      localZipPath,
    });

    zipPath = result.zipPath;
    meta = result.metadata;

    if (tracker) {
      tracker.complete(
        "fetch",
        `release ${meta.release} (${meta.size.toLocaleString()} bytes)`
      );
      tracker.add("download", "Download template");
      tracker.complete("download", meta.filename);
    }
  } catch (e: any) {
    if (tracker) {
      tracker.error("fetch", e.message);
    } else if (verbose) {
      console.error(chalk.red("Error downloading template:"), e.message);
    }
    throw e;
  }

  if (tracker) {
    tracker.add("extract", "Extract template");
    tracker.start("extract");
  } else if (verbose) {
    console.log("Extracting template...");
  }

  try {
    // Create project directory only if not using current directory
    if (!isCurrentDir) {
      await fs.ensureDir(projectPath);
    }

    // Extract to temporary location first
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "specify-"));

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir, true);

    const extractedItems = await fs.readdir(tempDir);

    if (tracker) {
      tracker.add("zip-list", "Archive contents");
      tracker.complete("zip-list", `${extractedItems.length} entries`);
    } else if (verbose) {
      console.log(chalk.cyan(`ZIP contains ${extractedItems.length} items`));
    }

    // Determine source directory (handle GitHub-style nested ZIP)
    let sourceDir = tempDir;
    const extractedStats = await Promise.all(
      extractedItems.map(async (item) => ({
        name: item,
        isDir: (await fs.stat(path.join(tempDir, item))).isDirectory(),
      }))
    );

    if (extractedStats.length === 1 && extractedStats[0].isDir) {
      sourceDir = path.join(tempDir, extractedStats[0].name);
      if (tracker) {
        tracker.add("flatten", "Flatten nested directory");
        tracker.complete("flatten");
      } else if (verbose) {
        console.log(chalk.cyan("Found nested directory structure"));
      }
    }

    if (tracker) {
      tracker.add("extracted-summary", "Extraction summary");
      tracker.start("extracted-summary");
    }

    // Copy contents to project directory
    const sourceItems = await fs.readdir(sourceDir);
    for (const item of sourceItems) {
      const sourcePath = path.join(sourceDir, item);
      const destPath = path.join(projectPath, item);

      const itemStat = await fs.stat(sourcePath);

      if (itemStat.isDirectory()) {
        if (await fs.pathExists(destPath)) {
          if (verbose && !tracker) {
            console.log(chalk.yellow(`Merging directory: ${item}`));
          }
          // Recursively copy directory contents
          await fs.copy(sourcePath, destPath, { overwrite: true });
        } else {
          await fs.copy(sourcePath, destPath);
        }
      } else {
        if ((await fs.pathExists(destPath)) && verbose && !tracker) {
          console.log(chalk.yellow(`Overwriting file: ${item}`));
        }
        await fs.copy(sourcePath, destPath);
      }
    }

    if (tracker) {
      tracker.complete("extracted-summary", `${sourceItems.length} items`);
    } else if (verbose) {
      console.log(chalk.cyan("Template files extracted"));
    }

    // Clean up temp directory
    await fs.remove(tempDir);

    if (tracker) {
      tracker.complete("extract");
    }
  } catch (e: any) {
    if (tracker) {
      tracker.error("extract", e.message);
    } else if (verbose) {
      console.error(chalk.red("Error extracting template:"), e.message);
      if (debug) {
        console.error(e);
      }
    }

    // Clean up project directory if created and not current directory
    if (!isCurrentDir && (await fs.pathExists(projectPath))) {
      await fs.remove(projectPath);
    }
    throw e;
  } finally {
    if (tracker) {
      tracker.add("cleanup", "Remove temporary archive");
    }

    // Clean up downloaded ZIP file
    if (await fs.pathExists(zipPath)) {
      await fs.unlink(zipPath);
      if (tracker) {
        tracker.complete("cleanup");
      } else if (verbose) {
        console.log(`Cleaned up: ${path.basename(zipPath)}`);
      }
    }
  }

  return { projectPath, version: meta.release };
}
