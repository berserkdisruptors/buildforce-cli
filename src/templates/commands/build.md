---
description: Execute the implementation following the spec and plan, with progress tracking, deviation logging, and iterative refinement.
---

The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

$ARGUMENTS

The text the user typed after `/build` in the triggering message **is** iteration-specific instructions, feedback, or changes they want for this build iteration. Assume you always have it available in this conversation. If they provided an empty command, proceed with the initial implementation.

Goal: Execute the implementation by following the specification and plan, tracking progress step-by-step, logging any deviations from the original plan, and requesting user confirmation before marking the feature complete.

Prerequisites:
- A specification MUST exist from a prior `/spec` command in this conversation.
- A plan MUST exist from a prior `/plan` command in this conversation.
- If either is missing, instruct the user to run the missing command(s) first.

Execution steps:

1. **Load Spec and Plan**: Retrieve the specification and plan created earlier in this conversation.
   - If no spec exists, STOP and instruct: "No specification found. Please run `/spec` first."
   - If no plan exists, STOP and instruct: "No plan found. Please run `/plan` first."
   - Parse both documents to understand requirements and implementation steps.

2. **Analyze Build Context**:
   - Determine if this is the **first iteration** (initial implementation) or a **subsequent iteration** (refinement/changes).
   - If subsequent iteration, review prior build attempts and any recorded deviations.
   - Parse user instructions ($ARGUMENTS) for this iteration (e.g., "change library X to Y", "fix the edge case for empty input").

3. **Initialize Progress Tracking**: Create an internal checklist based on the plan's implementation steps.
   - Example:
     ```
     [ ] Step 1: Setup project dependencies
     [ ] Step 2: Create data models
     [ ] Step 3: Implement core service logic
     [ ] Step 4: Add error handling
     [ ] Step 5: Write tests
     ```
   - Display this checklist to the user at the start of the build.

4. **Execute Implementation Step-by-Step**:
   - For each step in the plan:
     * **Announce** the step you're working on (e.g., "Step 2: Creating data models in `src/models/user.ts`").
     * **Implement** the step by creating/modifying files as specified.
     * **Validate** the step (e.g., check syntax, run relevant tests if applicable).
     * **Update progress** by marking the step complete (e.g., "[] Step 2: Create data models").
     * **Report** brief progress after completing each step.

5. **Track Deviations**: If you deviate from the original plan (due to user instructions, discovered issues, or better approaches):
   - **Log the deviation** with:
     * What was originally planned
     * What was actually done
     * Why the deviation occurred
   - Example:
     ```
     DEVIATION: Step 3 - Service Implementation
     - Original: Use library `axios` for HTTP requests
     - Actual: Used library `fetch` (native)
     - Reason: User requested change to avoid external dependency
     ```
   - Maintain a running deviation log throughout the build.

6. **Handle Errors and Blockers**:
   - If a step fails (e.g., tests don't pass, syntax error, missing dependency):
     * STOP immediately and report the issue to the user.
     * Suggest potential fixes or ask for guidance.
     * DO NOT mark the step as complete until resolved.
   - If you discover a gap in the spec or plan:
     * Flag it to the user and suggest updating the spec/plan.
     * Wait for user input before proceeding.

7. **Validate Against Spec**: After completing all implementation steps:
   - Cross-check the implementation against the spec's requirements.
   - Ensure all functional requirements are met.
   - Verify edge cases and error handling are implemented as specified.
   - Run tests (if they exist) to validate correctness.

8. **Present Results to User**:
   - **Summary of completed work**:
     * List all steps completed
     * Highlight files created or modified (with paths)
     * Show test results (if tests were run)
   - **Deviation log** (if any deviations occurred):
     * Display the complete log of changes from the original plan
   - **Validation status**:
     * Confirm whether all spec requirements are met
     * Flag any open issues or incomplete items

9. **Request Confirmation**:
   - Ask the user: "Does this implementation match your expectations? Is there anything you'd like to change, refine, or improve?"
   - Provide clear options:
     * "If satisfied, run `/complete` to finalize the feature."
     * "If changes are needed, provide feedback and run `/build [instructions]` again."
     * "If the spec or plan needs updating, run `/spec` or `/plan` with your changes."

10. **Iterate if Needed**:
    - If the user provides feedback or requests changes, repeat from step 2 with the new instructions.
    - Continue tracking deviations across iterations.
    - Ensure each iteration converges toward the user's desired outcome.

Behavior rules:
- NEVER proceed without both spec and planalways check for prerequisites.
- NEVER skip steps in the plan without user approvalfollow the plan sequentially.
- NEVER hide deviationsalways log and report changes from the original plan.
- ALWAYS track progress visibly so the user knows what's being worked on.
- ALWAYS validate against the spec after implementation.
- If the user requests a change that affects the spec or plan, suggest updating those documents.
- If a step is blocked or fails, STOP and ask for guidancedo not make assumptions.
- Keep progress updates concise but informative (file paths, brief description).
- DO NOT mark the feature as completethat's the job of `/complete`.
- Respect the **incremental change** philosophyimplement exactly what's in the spec, no more, no less.

Context: {$ARGUMENTS}
