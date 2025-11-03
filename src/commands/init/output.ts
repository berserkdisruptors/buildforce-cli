import path from "path";
import chalk from "chalk";
import boxen from "boxen";

/**
 * Display project setup information
 */
export function displaySetupInfo(
  projectName: string,
  projectPath: string,
  isHere: boolean
): void {
  const currentDir = process.cwd();

  const setupLines = [
    chalk.cyan("Buildforce Project Setup"),
    "",
    `${"Project".padEnd(15)} ${chalk.green(projectName)}`,
    `${"Working Path".padEnd(15)} ${chalk.dim(currentDir)}`,
  ];

  if (!isHere) {
    setupLines.push(`${"Target Path".padEnd(15)} ${chalk.dim(projectPath)}`);
  }

  console.log(
    boxen(setupLines.join("\n"), {
      padding: 1,
      borderColor: "cyan",
    })
  );
  console.log();
}

/**
 * Display agent folder security notice
 */
export function displayAgentSecurityNotice(
  selectedAi: string,
  agentFolderMap: Record<string, string>
): void {
  if (agentFolderMap[selectedAi]) {
    const agentFolder = agentFolderMap[selectedAi];
    console.log();
    console.log(
      boxen(
        `Some agents may store credentials, auth tokens, or other identifying and private artifacts in the agent folder within your project.\n` +
          `Consider adding ${chalk.cyan(
            agentFolder
          )} (or parts of it) to ${chalk.cyan(
            ".gitignore"
          )} to prevent accidental credential leakage.`,
        {
          title: chalk.yellow("Agent Folder Security"),
          padding: 1,
          borderColor: "yellow",
        }
      )
    );
  }
}

/**
 * Display next steps instructions
 */
export function displayNextSteps(
  projectName: string,
  projectPath: string,
  selectedAi: string,
  isHere: boolean
): void {
  const stepsLines: string[] = [];
  if (!isHere) {
    stepsLines.push(
      `1. Go to the project folder: ${chalk.cyan(`cd ${projectName}`)}`
    );
  } else {
    stepsLines.push("1. You're already in the project directory!");
  }

  let stepNum = 2;

  // Add Codex-specific setup step if needed
  if (selectedAi === "codex") {
    const codexPath = path.join(projectPath, ".codex");
    const cmd =
      process.platform === "win32"
        ? `setx CODEX_HOME "${codexPath}"`
        : `export CODEX_HOME="${codexPath}"`;

    stepsLines.push(
      `${stepNum}. Set ${chalk.cyan(
        "CODEX_HOME"
      )} environment variable before running Codex: ${chalk.cyan(cmd)}`
    );
    stepNum++;
  }

  stepsLines.push(
    `${stepNum}. Start using the spec-driven workflow with your AI agent:`
  );
  stepsLines.push(
    "   " +
      chalk.cyan("/research") +
      " - Gather context and prepare for development"
  );
  stepsLines.push(
    "   " +
      chalk.cyan("/spec") +
      "     - Define what to build (requirements) and how (plan)"
  );
  stepsLines.push(
    "   " +
      chalk.cyan("/build") +
      "    - Execute implementation with validation"
  );
  stepsLines.push(
    "   " +
      chalk.cyan("/complete") +
      " - Finalize spec and update knowledge base"
  );

  console.log();
  console.log(
    boxen(stepsLines.join("\n"), {
      title: "Next Steps",
      padding: 1,
      borderColor: "cyan",
    })
  );

  // Workflow details
  const workflowLines = [
    chalk.bold("Understanding the Workflow"),
    "",
    `The .buildforce directory stores project knowledge:`,
    `  ${chalk.cyan(
      ".buildforce/context/"
    )} - Accumulated project context from completed specs`,
    `  ${chalk.cyan(
      ".buildforce/specs/"
    )}   - Active and historical spec directories`,
    "",
    `Each workflow iteration creates a spec folder:`,
    `  ${chalk.gray("001-feature-name/")}  - First feature`,
    `  ${chalk.gray("002-another/")}       - Second feature`,
    `  ${chalk.gray("...")}`,
    "",
    `Start your first feature with ${chalk.cyan(
      "/research"
    )} to gather context,`,
    `then ${chalk.cyan("/spec")} to define what you're building.`,
  ];

  console.log();
  console.log(
    boxen(workflowLines.join("\n"), {
      title: "Workflow Guide",
      padding: 1,
      borderColor: "cyan",
    })
  );

  // Codex warning
  if (selectedAi === "codex") {
    const warningText =
      chalk.bold.yellow("Important Note:") +
      "\n\n" +
      `Custom prompts do not yet support arguments in Codex. You may need to manually specify additional project instructions directly in prompt files located in ${chalk.cyan(
        ".codex/prompts/"
      )}.\n\n` +
      `For more information, see: ${chalk.cyan(
        "https://github.com/openai/codex/issues/2890"
      )}`;

    console.log();
    console.log(
      boxen(warningText, {
        title: "Slash Commands in Codex",
        padding: 1,
        borderColor: "yellow",
      })
    );
  }
}
