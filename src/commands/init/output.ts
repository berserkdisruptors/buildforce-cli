import chalk from "chalk";
import { MINT_COLOR, GREEN_COLOR } from "../../constants.js";
import { createBox } from "../../utils/box.js";

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
    `${"Project".padEnd(15)} ${GREEN_COLOR(projectName)}`,
    `${"Working Path".padEnd(15)} ${chalk.dim(currentDir)}`,
  ];

  if (!isHere) {
    setupLines.push(`${"Target Path".padEnd(15)} ${chalk.dim(projectPath)}`);
  }

  console.log(createBox(setupLines.join("\n")));
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
    const securityContent =
      `Some agents may store credentials, auth tokens, or other identifying and private artifacts in the agent folder within your project.\n` +
      `Consider adding ${MINT_COLOR(
        agentFolder
      )} (or parts of it) to ${MINT_COLOR(
        ".gitignore"
      )} to prevent accidental credential leakage.`;
    console.log(createBox(securityContent, { title: "Agent Folder Security" }));
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
  // Project Ready details
  const projectReadyLines = [
    `The ${MINT_COLOR(
      ".buildforce"
    )} directory is created and will store your context repository:`,
    "",
    `${MINT_COLOR(
      ".buildforce/context/"
    )} - Accumulated project context from past coding sessions`,
    "",
    `${MINT_COLOR(
      "IMPORTANT:"
    )} The .buildforce directory is version-controlled and will be used to track your context repository.`,
  ];

  console.log();
  console.log(
    createBox(projectReadyLines.join("\n"), { title: "Project Ready" })
  );

  // TODO: Update next steps and pro tips once all the features are ready (verification, assessment, etc.)
  // const stepsLines: string[] = [];
  // if (!isHere) {
  //   stepsLines.push(
  //     `1. Go to the project folder: ${MINT_COLOR(`cd ${projectName}`)}`
  //   );
  // } else {
  //   stepsLines.push("1. You're already in the project directory!");
  // }

  // let stepNum = 2;

  // stepsLines.push(
  //   `${stepNum}. Start using the spec-driven workflow with ${MINT_COLOR(
  //     "slash commands"
  //   )} to interact with your AI agent:`
  // );
  // stepsLines.push(
  //   "   " +
  //     MINT_COLOR("/buildforce.research") +
  //     " - Search accumulated project context and explore codebase patterns"
  // );
  // stepsLines.push(
  //   "   " +
  //     MINT_COLOR("/buildforce.plan") +
  //     "     - Materialize your intent into a structured specification and plan"
  // );
  // stepsLines.push(
  //   "   " +
  //     MINT_COLOR("/buildforce.build") +
  //     "    - Let the agent follow the plan"
  // );
  // stepsLines.push(
  //   "   " +
  //     MINT_COLOR("/buildforce.complete") +
  //     " - Validate requirements and update the context repository"
  // );
  // stepsLines.push(
  //   "   " +
  //     MINT_COLOR("/buildforce.document") +
  //     " - Create context files for existing functionality without creating a spec"
  // );

  // console.log();
  // console.log(createBox(stepsLines.join("\n"), { title: "Next Steps" }));

  // const proTipsLines = [
  //   `1. Use ${MINT_COLOR("/buildforce.research")} and then ${MINT_COLOR(
  //     "/buildforce.document"
  //   )} to create context files for existing functionality without creating a spec`,
  //   "",
  //   `2. Iterate as much as you want on each phase (research, spec or build) until you are confident that the agent has all the needed context, your intent is captured properly, you agree with the plan and the implementation is complete`,
  // ];

  // console.log();
  // console.log(createBox(proTipsLines.join("\n"), { title: "Pro Tips" }));
}
