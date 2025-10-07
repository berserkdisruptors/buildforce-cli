import { execSync } from "child_process";
import {
  existsSync,
  statSync,
  openSync,
  readSync,
  closeSync,
  chmodSync,
  readdirSync,
} from "fs";
import { join, relative } from "path";
import which from "which";
import chalk from "chalk";
import fs from "fs-extra";
import { CLAUDE_LOCAL_PATH } from "./constants.js";

/**
 * Get GitHub token from CLI argument or environment variables
 */
export function getGithubToken(cliToken?: string): string | undefined {
  const token =
    cliToken || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
  return token.trim() || undefined;
}

/**
 * Get GitHub authorization headers if token exists
 */
export function getGithubAuthHeaders(
  cliToken?: string
): Record<string, string> {
  const token = getGithubToken(cliToken);
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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
      console.log(chalk.cyan("Initializing git repository..."));
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

/**
 * Run a shell command and optionally capture output
 */
export function runCommand(
  cmd: string[],
  options: {
    checkReturn?: boolean;
    capture?: boolean;
    shell?: boolean;
    cwd?: string;
  } = {}
): string | null {
  const { checkReturn = true, capture = false, shell = false, cwd } = options;

  try {
    if (capture) {
      const execOptions: any = {
        encoding: "utf-8",
        stdio: "pipe",
      };
      if (shell) execOptions.shell = true;
      if (cwd) execOptions.cwd = cwd;

      const result = execSync(cmd.join(" "), execOptions);
      return result.trim();
    } else {
      const execOptions: any = {
        stdio: "inherit",
      };
      if (shell) execOptions.shell = true;
      if (cwd) execOptions.cwd = cwd;

      execSync(cmd.join(" "), execOptions);
      return null;
    }
  } catch (e: any) {
    if (checkReturn) {
      console.error(chalk.red("Error running command:"), cmd.join(" "));
      console.error(chalk.red("Exit code:"), e.status);
      if (e.stderr) {
        console.error(chalk.red("Error output:"), e.stderr.toString());
      }
      throw e;
    }
    return null;
  }
}

/**
 * Ensure scripts have executable permissions (POSIX only)
 */
export function ensureExecutableScripts(
  projectPath: string,
  debug: boolean = false
): {
  updated: number;
  failures: string[];
} {
  if (debug)
    console.log(
      chalk.dim(`[DEBUG] ensureExecutableScripts: projectPath=${projectPath}`)
    );

  if (process.platform === "win32") {
    if (debug)
      console.log(
        chalk.dim("[DEBUG] Platform is Windows, skipping script permissions")
      );
    return { updated: 0, failures: [] };
  }

  const scriptsRoot = join(projectPath, ".specify", "scripts");

  if (debug)
    console.log(chalk.dim(`[DEBUG] Looking for scripts in: ${scriptsRoot}`));

  if (!existsSync(scriptsRoot)) {
    if (debug)
      console.log(chalk.dim("[DEBUG] Scripts directory does not exist"));
    return { updated: 0, failures: [] };
  }

  if (!statSync(scriptsRoot).isDirectory()) {
    if (debug)
      console.log(
        chalk.dim("[DEBUG] Scripts path exists but is not a directory")
      );
    return { updated: 0, failures: [] };
  }

  const failures: string[] = [];
  let updated = 0;

  function processDir(dir: string) {
    if (debug) console.log(chalk.dim(`[DEBUG] Processing directory: ${dir}`));
    const entries = readdirSync(dir, { withFileTypes: true });
    if (debug)
      console.log(
        chalk.dim(`[DEBUG] Found ${entries.length} entries in ${dir}`)
      );

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (debug)
          console.log(
            chalk.dim(`[DEBUG] Recursing into directory: ${entry.name}`)
          );
        processDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".sh")) {
        if (debug)
          console.log(chalk.dim(`[DEBUG] Processing .sh file: ${entry.name}`));
        try {
          // Check if file starts with shebang
          const fd = openSync(fullPath, "r");
          const buffer = Buffer.alloc(2);
          readSync(fd, buffer, 0, 2, 0);
          closeSync(fd);

          const shebang = buffer.toString();
          if (debug)
            console.log(
              chalk.dim(`[DEBUG]   Shebang check: "${shebang}" (expected "#!")`)
            );

          if (shebang !== "#!") {
            if (debug)
              console.log(
                chalk.dim(`[DEBUG]   Skipping ${entry.name} - no shebang`)
              );
            continue;
          }

          const stats = statSync(fullPath);
          const mode = stats.mode;
          if (debug)
            console.log(
              chalk.dim(`[DEBUG]   Current mode: ${mode.toString(8)}`)
            );

          // Check if already executable
          if (mode & 0o111) {
            if (debug)
              console.log(chalk.dim(`[DEBUG]   Already executable, skipping`));
            continue;
          }

          // Add execute bits
          let newMode = mode;
          if (mode & 0o400) newMode |= 0o100;
          if (mode & 0o040) newMode |= 0o010;
          if (mode & 0o004) newMode |= 0o001;
          if (!(newMode & 0o100)) newMode |= 0o100;

          if (debug)
            console.log(
              chalk.dim(`[DEBUG]   Setting new mode: ${newMode.toString(8)}`)
            );
          chmodSync(fullPath, newMode);
          updated++;
          if (debug)
            console.log(
              chalk.dim(`[DEBUG]   ✓ Updated permissions for ${entry.name}`)
            );
        } catch (e: any) {
          const errorMsg = `${relative(scriptsRoot, fullPath)}: ${e.message}`;
          if (debug) console.log(chalk.dim(`[DEBUG]   ✗ Error: ${errorMsg}`));
          failures.push(errorMsg);
        }
      }
    }
  }

  processDir(scriptsRoot);

  if (debug)
    console.log(
      chalk.dim(
        `[DEBUG] ensureExecutableScripts complete: updated=${updated}, failures=${failures.length}`
      )
    );

  return { updated, failures };
}
