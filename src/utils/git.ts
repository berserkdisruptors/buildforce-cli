import { execSync } from "child_process";
import { statSync } from "fs";
import chalk from "chalk";
import { MINT_COLOR } from "../constants.js";

/**
 * Check if a directory is inside a git repository
 */
export function isGitRepo(path?: string): boolean {
  const targetPath = path || process.cwd();

  try {
    const stats = statSync(targetPath);
    if (!stats.isDirectory()) {
      return false;
    }
  } catch (e) {
    return false;
  }

  try {
    execSync("git rev-parse --is-inside-work-tree", {
      cwd: targetPath,
      stdio: "pipe",
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Initialize a git repository
 */
export function initGitRepo(
  projectPath: string,
  quiet: boolean = false
): boolean {
  try {
    const originalCwd = process.cwd();
    process.chdir(projectPath);

    if (!quiet) {
      console.log(MINT_COLOR("Initializing git repository..."));
    }

    execSync("git init", { stdio: quiet ? "pipe" : "inherit" });
    execSync("git add .", { stdio: "pipe" });
    execSync('git commit -m "Initial commit from Specify template"', {
      stdio: "pipe",
    });

    if (!quiet) {
      console.log(chalk.green("✓") + " Git repository initialized");
    }

    process.chdir(originalCwd);
    return true;
  } catch (e) {
    if (!quiet) {
      console.error(chalk.red("Error initializing git repository:"), e);
    }
    return false;
  }
}
