import chalk from "chalk";
import { showBanner, selectWithArrows } from "../lib/interactive.js";
import { TAGLINE, MINT_COLOR, GREEN_COLOR } from "../constants.js";
import { createBox } from "../utils/box.js";
import fs from "fs-extra";
import path from "path";

/**
 * Hard wrap text to fit within a width
 */
function hardWrap(text: string, width: number): string[] {
  if (text.length <= width) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current ? current.length + 1 : 0) + w.length > width) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = current ? current + " " + w : w;
    }
  }
  if (current) lines.push(current);
  return lines;
}


/**
 * Workflow definition interface
 */
interface Workflow {
  id: string;
  name: string;
  commandSequence: string[];
  description?: string;
  useCase?: string;
}

/**
 * Hardcoded workflow definitions (Phase 2)
 */
export const WORKFLOWS: Record<string, Omit<Workflow, "description" | "useCase">> = {
  basic: {
    id: "basic",
    name: "Basic Workflow",
    commandSequence: ["/spec", "/build"],
  },
  full: {
    id: "full",
    name: "Full Workflow",
    commandSequence: ["/research", "/spec", "/build", "/complete"],
  },
  documentation: {
    id: "documentation",
    name: "Documentation Workflow",
    commandSequence: ["/research [topic]", "/document [module]"],
  },
};

/**
 * Read README.md from project root
 */
async function readReadme(projectRoot: string): Promise<string> {
  const readmePath = path.join(projectRoot, "README.md");
  
  try {
    return await fs.readFile(readmePath, "utf-8");
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error(
        `README.md not found in project root (${projectRoot}).\n` +
        `Please ensure you're running this command from the Buildforce project root directory.`
      );
    }
    throw error;
  }
}

/**
 * Extract workflow descriptions from README.md
 * Parses sections around lines 102-120 for workflow scenarios
 */
function extractWorkflowDescriptions(readmeContent: string): Record<string, { description: string; useCase: string }> {
  const descriptions: Record<string, { description: string; useCase: string }> = {};

  // Use flexible regex to find workflow sections
  // Pattern: "1. **Basic workflow** (recommended for simple updates):"
  const workflowRegex = /(\d+)\.\s+\*\*([^*]+?)\s+workflow\*\*\s*\(([^)]+)\)/gi;
  let match;

  while ((match = workflowRegex.exec(readmeContent)) !== null) {
    const name = match[2].toLowerCase().trim();
    const useCase = match[3].trim();
    let workflowId: string | null = null;

    if (name.includes("basic")) {
      workflowId = "basic";
    } else if (name.includes("full")) {
      workflowId = "full";
    } else if (name.includes("documentation")) {
      workflowId = "documentation";
    }

    if (workflowId) {
      // Extract description from the following lines (until next numbered item or code block)
      const startPos = match.index + match[0].length;
      const nextSection = readmeContent.substring(startPos);
      const nextMatch = nextSection.match(/^\s*\d+\.\s+\*\*/m);
      const endPos = nextMatch ? startPos + (nextMatch.index || 0) : startPos + 500;
      const descriptionText = readmeContent.substring(startPos, endPos);
      
      // Clean up description - remove code blocks, extra whitespace
      let description = descriptionText
        .replace(/```[\s\S]*?```/g, "") // Remove code blocks
        .replace(/\n/g, " ") // Replace newlines with spaces
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();

      // Take first sentence or first 100 chars
      const firstSentence = description.match(/^[^.!?]+[.!?]/);
      description = firstSentence ? firstSentence[0] : description.substring(0, 100).trim();

      descriptions[workflowId] = {
        description: description || `${workflowId} workflow`,
        useCase,
      };
    }
  }

  // Set defaults for workflows not found or new ones
  if (!descriptions.basic) {
    descriptions.basic = {
      description: "Simple workflow for quick updates",
      useCase: "Recommended for simple updates",
    };
  }
  if (!descriptions.full) {
    descriptions.full = {
      description: "Complete workflow from research to completion",
      useCase: "Recommended for new features and bug fixes",
    };
  }
  if (!descriptions.documentation) {
    descriptions.documentation = {
      description: "Document existing functionality",
      useCase: "Manual context contribution",
    };
  }

  return descriptions;
}

/**
 * Default workflow descriptions for use in help text (when README is not available)
 */
export const DEFAULT_WORKFLOW_DESCRIPTIONS: Record<string, { description: string; useCase: string }> = {
  basic: {
    description: "Simple workflow for quick updates",
    useCase: "Recommended for simple updates",
  },
  full: {
    description: "Complete workflow from research to completion",
    useCase: "Recommended for new features and bug fixes",
  },
  documentation: {
    description: "Document existing functionality",
    useCase: "Manual context contribution",
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
    ...workflow.commandSequence.map(cmd => `  ${MINT_COLOR("→")} ${chalk.bold(cmd)}`),
    "",
    MINT_COLOR("Description:"),
    chalk.dim(workflow.description || "No description available"),
    "",
    MINT_COLOR("When to Use:"),
    chalk.dim(workflow.useCase || "Various development tasks"),
  ];

  console.log();
  console.log(createBox(contentLines, { title: workflow.name, width: fixedInner }));
  console.log();
  // Add blank row below workflow display for visual separation
  console.log();
}

/**
 * Examples command - displays workflow examples interactively
 */
export async function examplesCommand(): Promise<void> {
  showBanner("", TAGLINE);

  const projectRoot = process.cwd();

  // Check if interactive (TTY)
  if (!process.stdin.isTTY) {
    console.log(
      MINT_COLOR("Interactive workflow selection requires a terminal.\n") +
      chalk.dim("Available workflows: basic, full, documentation")
    );
    return;
  }

  try {
    // Read README.md
    const readmeContent = await readReadme(projectRoot);

    // Extract workflow descriptions
    const descriptions = extractWorkflowDescriptions(readmeContent);

    // Merge hardcoded workflows with extracted descriptions
    const workflows: Record<string, Workflow> = {};
    for (const [id, workflow] of Object.entries(WORKFLOWS)) {
      const desc = descriptions[id] || { description: "", useCase: "" };
      workflows[id] = {
        ...workflow,
        description: desc.description || `${workflow.name} workflow`,
        useCase: desc.useCase || "Use for various development tasks",
      };
    }

    // Prepare workflow choices for interactive selection
    const workflowChoices: Record<string, string> = {};
    for (const [id, workflow] of Object.entries(workflows)) {
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
      const selectedWorkflow = workflows[selectedId];
      if (!selectedWorkflow) {
        console.error(chalk.red("Error: Selected workflow not found"));
        process.exit(1);
        return; // TypeScript: ensure we don't continue after exit
      }

      // Always display the workflow
      displayWorkflow(selectedWorkflow);
      console.log(GREEN_COLOR("✓ Workflow example displayed"));
      
      // Ask if user wants to view another workflow
      const continueChoices: Record<string, string> = {
        "back": "View another workflow",
        "exit": "Exit"
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
        console.error(MINT_COLOR("\nUnexpected error in selection, exiting..."));
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
