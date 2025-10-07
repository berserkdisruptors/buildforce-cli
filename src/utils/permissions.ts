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
import chalk from "chalk";

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
