import { execSync } from "child_process";
import chalk from "chalk";

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
