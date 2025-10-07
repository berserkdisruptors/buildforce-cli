---
description: Design the implementation approach (HOW) based on the specification, including architecture, patterns, libraries, and step-by-step execution plan.
---

The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

$ARGUMENTS

The text the user typed after `/plan` in the triggering message **is** planning instructions or constraints they want you to consider. Assume you always have it available in this conversation. If they provided an empty command, proceed with standard planning.

Goal: Design a comprehensive implementation plan that defines HOW to build what's specified in the spec, including architecture decisions, design patterns, libraries, file structure, and a numbered sequence of implementation steps.

Prerequisites:
- A specification MUST exist from a prior `/spec` command in this conversation.
- If no spec exists, instruct the user to run `/spec` first.

Execution steps:

1. **Load Specification**: Retrieve the specification created in this conversation (from the `/spec` command).
   - If no spec is found, STOP and instruct: "No specification found. Please run `/spec` first to define what needs to be built."
   - Parse the spec to understand requirements, scope, constraints, and dependencies.

2. **Analyze Planning Context**:
   - Consider any planning instructions provided by the user ($ARGUMENTS).
   - Review any prior `/research` findings in this conversation for technical context.
   - Identify architectural constraints (existing patterns, tech stack, conventions).
   - Understand the current codebase structure and where changes will be made.

3. **Make Design Decisions**: Address the following areas systematically:

   **Architecture & Approach**:
   - High-level architectural pattern (e.g., layered, modular, event-driven)
   - Where this change fits in the existing system
   - New components or modifications to existing components

   **Technology Choices**:
   - Libraries, frameworks, or tools to use (justify each choice)
   - APIs or external services to integrate
   - Design patterns to apply (e.g., Factory, Strategy, Observer)

   **Data & State Management**:
   - How data will be structured and stored
   - State management approach
   - Data flow and transformations

   **File & Code Organization**:
   - New files to create (with paths)
   - Existing files to modify (with paths)
   - Folder structure changes (if any)

   **Testing Strategy**:
   - What types of tests are needed (unit, integration, e2e)
   - Key test scenarios based on spec requirements
   - How to validate edge cases and error handling

4. **Generate Implementation Plan**: Create a numbered, sequential plan with the following structure:

   ## Implementation Plan

   ### Architecture Overview
   - High-level description of the solution approach
   - Component diagram or textual representation of how pieces fit together

   ### Design Decisions
   - **Library/Tool**: [Name] - [Rationale for choosing it]
   - **Pattern**: [Pattern Name] - [Why it fits this problem]
   - **Approach**: [High-level strategy] - [Why this is the best approach]

   ### File Structure
   ```
   path/to/new/file.ts (new)
   path/to/existing/file.ts (modify)
   ```

   ### Implementation Steps
   1. [Setup/preparation step] - [What and why]
   2. [Foundation/core step] - [What and why]
   3. [Integration step] - [What and why]
   4. [Testing step] - [What and why]
   5. [Polish/validation step] - [What and why]

   Each step should:
   - Be specific and actionable
   - Reference file paths where work will be done
   - Explain WHY this step is necessary
   - Indicate dependencies on previous steps
   - Be ordered to minimize rework (e.g., models before services, tests before implementation if TDD)

   ### Testing Plan
   - Test files to create or modify
   - Key test scenarios from the spec
   - Coverage expectations

   ### Risk & Considerations
   - Potential challenges or unknowns
   - Tradeoffs made in the design
   - Areas that may need iteration

5. **Validate Plan Alignment**:
   - Ensure every requirement in the spec is addressed by at least one implementation step.
   - Check that the plan respects all constraints and dependencies from the spec.
   - Verify the plan is realistic and doesn't introduce unnecessary complexity.
   - Confirm the plan follows existing codebase conventions and patterns.

6. **Present Plan to User**:
   - Display the complete implementation plan.
   - Highlight key design decisions and rationale.
   - Ask: "Does this plan align with how you would approach the implementation? Are there any changes, alternative approaches, or specific preferences you have?"

7. **Iterate if Needed**:
   - If the user requests changes (e.g., "use library Y instead of X", "split step 3 into smaller steps"), update the plan accordingly.
   - Track iterations and ensure the plan converges.
   - If the user suggests a change that affects the spec, flag it and ask if the spec should be updated.

8. **Save Plan** (optional for future persistence):
   - If the workflow includes saving artifacts, store the plan in a designated location (e.g., `.buildforce/plans/feature-name.md`).
   - Provide the file path to the user for reference.

9. **Suggest Next Steps**:
   - If the plan is approved, suggest: "Ready to build? Run `/build` to start the implementation."
   - If there are unresolved questions or decisions, suggest resolving them before building.

Behavior rules:
- NEVER proceed without a specificationalways check for a prior `/spec` command.
- NEVER make arbitrary design decisionsjustify every choice with reasoning.
- NEVER create overly complex plansfavor simplicity and incrementality.
- ALWAYS ensure implementation steps are ordered logically (foundational work first).
- ALWAYS reference specific file paths in the plan for clarity.
- If the user's planning instructions ($ARGUMENTS) conflict with the spec, ask for clarification.
- If multiple approaches are viable, present options and ask the user to choose.
- Keep the plan actionableavoid vague steps like "implement feature X" (break it down).
- Respect the **incremental change** philosophythe plan should match the focused scope of the spec.

Context: {$ARGUMENTS}
