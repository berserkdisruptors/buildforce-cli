import chalk from "chalk";
import { showBanner, selectWithArrows } from "../lib/interactive.js";
import { TAGLINE, MINT_COLOR, GREEN_COLOR } from "../constants.js";
import { createBox } from "../utils/box.js";

/**
 * Workflow definition interface
 */
interface Workflow {
  id: string;
  name: string;
  commandSequence: string[];
  description: string;
  useCase: string;
}

/**
 * Complete workflow definitions with descriptions and use cases
 */
export const WORKFLOWS: Record<string, Workflow> = {
  basic: {
    id: "basic",
    name: "Basic Workflow",
    commandSequence: ["/spec", "/build"],
    description:
      "Streamlined workflow that goes directly from specification to implementation, skipping research and completion steps",
    useCase:
      "Recommended for simple updates and well-understood changes that don't require additional context gathering",
  },
  full: {
    id: "full",
    name: "Full Workflow",
    commandSequence: ["/research", "/spec", "/build", "/complete"],
    description:
      "Context-aware workflow that accumulates research, materializes it into structured specs & warms up the context window, executes implementation with context consumption, and enriches the knowledge repository upon completion",
    useCase:
      "Recommended for new features and bug fixes that benefit from context gathering, research materialization, and knowledge accumulation for future work",
  },
  documentation: {
    id: "documentation",
    name: "Documentation Workflow",
    commandSequence: ["/research [topic]", "/document [module]"],
    description:
      "Standalone utility workflow that gathers context via research and materializes it directly into searchable context files, bypassing the spec-driven development cycle",
    useCase:
      "Recommended for documenting legacy code, discovered patterns, architectural decisions, and existing functionality that doesn't require full spec/plan/build/complete workflow",
  },
};

/**
 * Display selected workflow example
 */
function displayWorkflow(workflow: Workflow): void {
  const helpWidth = process.stdout.columns || 80;
  const fixedInner = Math.min(70, Math.max(20, helpWidth - 2));

  const contentLines = [
    MINT_COLOR("Command Sequence:"),
    "",
    ...workflow.commandSequence.map(
      (cmd) => `  ${MINT_COLOR("→")} ${chalk.bold(cmd)}`
    ),
    "",
    MINT_COLOR("Description:"),
    chalk.dim(workflow.description),
    "",
    MINT_COLOR("When to Use:"),
    chalk.dim(workflow.useCase),
  ];

  console.log();
  console.log(
    createBox(contentLines, { title: workflow.name, width: fixedInner })
  );
  console.log();
  // Add blank row below workflow display for visual separation
  console.log();
}

/**
 * Examples command - displays workflow examples interactively
 */
export async function examplesCommand(): Promise<void> {
  showBanner("", TAGLINE);

  // Check if interactive (TTY)
  if (!process.stdin.isTTY) {
    console.log(
      MINT_COLOR("Interactive workflow selection requires a terminal.\n") +
        chalk.dim("Available workflows: basic, full, documentation")
    );
    return;
  }

  try {
    // Prepare workflow choices for interactive selection
    const workflowChoices: Record<string, string> = {};
    for (const [id, workflow] of Object.entries(WORKFLOWS)) {
      workflowChoices[id] = `${workflow.name} - ${workflow.useCase}`;
    }

    // Loop to allow viewing multiple workflows
    let shouldContinue = true;
    while (shouldContinue) {
      // Interactive selection
      const selectedId = await selectWithArrows(
        workflowChoices,
        "Select a workflow to view its example:",
        "basic"
      );

      // Display selected workflow
      const selectedWorkflow = WORKFLOWS[selectedId];
      if (!selectedWorkflow) {
        console.error(chalk.red("Error: Selected workflow not found"));
        process.exit(1);
        return;
      }

      // Always display the workflow
      displayWorkflow(selectedWorkflow);
      console.log(GREEN_COLOR("✓ Workflow example displayed"));

      // Ask if user wants to view another workflow
      const continueChoices: Record<string, string> = {
        back: "View another workflow",
        exit: "Exit",
      };

      let continueChoice: string;
      try {
        continueChoice = await selectWithArrows(
          continueChoices,
          "What would you like to do next?",
          "back"
        );
      } catch (error: any) {
        // If there's an error getting user input, exit gracefully
        console.error(
          MINT_COLOR("\nUnexpected error in selection, exiting...")
        );
        shouldContinue = false;
        break;
      }

      // Ensure we got a valid choice
      if (!continueChoice) {
        // If no choice was made, default to exit to be safe
        shouldContinue = false;
        break;
      }

      // Check if user wants to exit - ensure robust comparison
      const normalizedChoice = String(continueChoice).trim().toLowerCase();
      if (normalizedChoice === "exit") {
        // Add blank row before exiting for visual separation
        console.log();
        // Explicitly exit the Node.js process to return control to shell
        process.exit(0);
      }

      // If "back" or anything else, loop continues and shows workflow selection again
      // (shouldContinue remains true, so loop will continue)
    }

    // This point should not be reached if exit was selected above
    // Add blank row before exiting for visual separation
    console.log();

    // Ensure terminal cleanup - release stdin if needed (fallback if we reach here)
    if (process.stdin.isTTY && process.stdin.isPaused()) {
      process.stdin.resume();
    }
  } catch (error: any) {
    console.error(chalk.red("Error:"), error.message);
    process.exit(1);
  }
}
