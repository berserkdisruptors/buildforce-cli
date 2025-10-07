import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import boxen from "boxen";
import inquirer from "inquirer";

/**
 * Validate and normalize project name and location
 */
export async function validateProjectSetup(
  inputProjectName?: string,
  here: boolean = false,
  force: boolean = false
): Promise<{
  projectName: string;
  projectPath: string;
  isHere: boolean;
}> {
  let projectName = inputProjectName;
  let isHere = here;

  // Handle '.' as shorthand for current directory (equivalent to --here)
  if (projectName === ".") {
    isHere = true;
    projectName = undefined;
  }

  // Validate arguments
  if (isHere && projectName) {
    console.error(
      chalk.red("Error:"),
      "Cannot specify both project name and --here flag"
    );
    process.exit(1);
  }

  if (!isHere && !projectName) {
    console.error(
      chalk.red("Error:"),
      "Must specify either a project name, use '.' for current directory, or use --here flag"
    );
    process.exit(1);
  }

  // Determine project directory
  let projectPath: string;
  if (isHere) {
    projectName = path.basename(process.cwd());
    projectPath = process.cwd();

    // Check if current directory has any files
    const existingItems = await fs.readdir(projectPath);
    if (existingItems.length > 0) {
      console.log(
        chalk.yellow("Warning:"),
        `Current directory is not empty (${existingItems.length} items)`
      );
      console.log(
        chalk.yellow(
          "Template files will be merged with existing content and may overwrite existing files"
        )
      );

      if (force) {
        console.log(
          chalk.cyan(
            "--force supplied: skipping confirmation and proceeding with merge"
          )
        );
      } else {
        // Ask for confirmation
        const { confirmed } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmed",
            message: "Do you want to continue?",
            default: false,
          },
        ]);

        if (!confirmed) {
          console.log(chalk.yellow("Operation cancelled"));
          process.exit(0);
        }
      }
    }
  } else {
    projectPath = path.resolve(projectName!);

    // Check if project directory already exists
    if (await fs.pathExists(projectPath)) {
      console.log();
      console.log(
        boxen(
          `Directory '${chalk.cyan(projectName)}' already exists\n` +
            "Please choose a different project name or remove the existing directory.",
          {
            title: chalk.red("Directory Conflict"),
            padding: 1,
            borderColor: "red",
          }
        )
      );
      console.log();
      process.exit(1);
    }
  }

  return { projectName: projectName!, projectPath, isHere };
}

/**
 * Validate AI assistant selection
 */
export function validateAiAssistant(
  selectedAi: string,
  aiChoices: Record<string, string>
): void {
  if (!aiChoices[selectedAi]) {
    console.error(
      chalk.red("Error:"),
      `Invalid AI assistant '${selectedAi}'. Choose from: ${Object.keys(
        aiChoices
      ).join(", ")}`
    );
    process.exit(1);
  }
}

/**
 * Validate script type selection
 */
export function validateScriptType(
  selectedScript: string,
  scriptTypeChoices: Record<string, string>
): void {
  if (!scriptTypeChoices[selectedScript]) {
    console.error(
      chalk.red("Error:"),
      `Invalid script type '${selectedScript}'. Choose from: ${Object.keys(
        scriptTypeChoices
      ).join(", ")}`
    );
    process.exit(1);
  }
}

/**
 * Check agent tool availability
 */
export function checkAgentTool(
  selectedAi: string,
  aiChoices: Record<string, string>,
  checkTool: (tool: string) => boolean
): void {
  const agentChecks: Record<string, string> = {
    claude: "https://docs.anthropic.com/en/docs/claude-code/setup",
    gemini: "https://github.com/google-gemini/gemini-cli",
    qwen: "https://github.com/QwenLM/qwen-code",
    opencode: "https://opencode.ai",
    codex: "https://github.com/openai/codex",
    auggie: "https://docs.augmentcode.com/cli/setup-auggie/install-auggie-cli",
  };

  if (agentChecks[selectedAi]) {
    if (!checkTool(selectedAi)) {
      const installUrl = agentChecks[selectedAi];
      console.log();
      console.log(
        boxen(
          `${chalk.cyan(selectedAi)} not found\n` +
            `Install with: ${chalk.cyan(installUrl)}\n` +
            `${aiChoices[selectedAi]} is required to continue with this project type.\n\n` +
            `Tip: Use ${chalk.cyan("--ignore-agent-tools")} to skip this check`,
          {
            title: chalk.red("Agent Detection Error"),
            padding: 1,
            borderColor: "red",
          }
        )
      );
      console.log();
      process.exit(1);
    }
  }
}
