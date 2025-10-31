import path from "path";
import chalk from "chalk";
import boxen from "boxen";
import { MINT_COLOR } from "../../constants.js";

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
    MINT_COLOR("Buildforce Project Setup"),
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
      borderColor: "#3EB489",
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
          `Consider adding ${MINT_COLOR(
            agentFolder
          )} (or parts of it) to ${MINT_COLOR(
            ".gitignore"
          )} to prevent accidental credential leakage.`,
        {
          title: MINT_COLOR("Agent Folder Security"),
          padding: 1,
          borderColor: "#3EB489",
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
      `1. Go to the project folder: ${MINT_COLOR(`cd ${projectName}`)}`
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
      `${stepNum}. Set ${MINT_COLOR(
        "CODEX_HOME"
      )} environment variable before running Codex: ${MINT_COLOR(cmd)}`
    );
    stepNum++;
  }

  stepsLines.push(
    `${stepNum}. Start using the spec-driven workflow with your AI agent:`
  );
  stepsLines.push(
    "   " +
      MINT_COLOR("/research") +
      " - Gather context and prepare for development"
  );
  stepsLines.push(
    "   " +
      MINT_COLOR("/spec") +
      "     - Define what to build (requirements & scope)"
  );
  stepsLines.push(
    "   " +
      MINT_COLOR("/plan") +
      "     - Design how to build (architecture & steps)"
  );
  stepsLines.push(
    "   " +
      MINT_COLOR("/build") +
      "    - Execute implementation with validation"
  );
  stepsLines.push(
    "   " +
      MINT_COLOR("/complete") +
      " - Finalize spec and update knowledge base"
  );

  console.log();
  console.log(
    boxen(stepsLines.join("\n"), {
      title: "Next Steps",
      padding: 1,
      borderColor: "#3EB489",
    })
  );

  // Workflow details
  const workflowLines = [
    chalk.bold("Understanding the Workflow"),
    "",
    `The .buildforce directory stores project knowledge:`,
    `  ${MINT_COLOR(
      ".buildforce/context/"
    )} - Accumulated project context from completed specs`,
    `  ${MINT_COLOR(
      ".buildforce/specs/"
    )}   - Active and historical spec directories`,
    "",
    `Each workflow iteration creates a spec folder:`,
    `  ${chalk.gray("001-feature-name/")}  - First feature`,
    `  ${chalk.gray("002-another/")}       - Second feature`,
    `  ${chalk.gray("...")}`,
    "",
    `Start your first feature with ${MINT_COLOR(
      "/research"
    )} to gather context,`,
    `then ${MINT_COLOR("/spec")} to define what you're building.`,
  ];

  console.log();
  console.log(
    boxen(workflowLines.join("\n"), {
      title: "Workflow Guide",
      padding: 1,
      borderColor: "#3EB489",
    })
  );

  // Codex warning
  if (selectedAi === "codex") {
    const warningText =
      MINT_COLOR(chalk.bold("Important Note:")) +
      "\n\n" +
      `Custom prompts do not yet support arguments in Codex. You may need to manually specify additional project instructions directly in prompt files located in ${MINT_COLOR(
        ".codex/prompts/"
      )}.\n\n` +
      `For more information, see: ${MINT_COLOR(
        "https://github.com/openai/codex/issues/2890"
      )}`;

    console.log();
    console.log(
      boxen(warningText, {
        title: "Slash Commands in Codex",
        padding: 1,
        borderColor: "#3EB489",
      })
    );
  }
}
