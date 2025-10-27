---
description: Design the implementation approach (HOW) based on the specification, including architecture, patterns, libraries, and step-by-step execution plan.
scripts:
  sh: src/scripts/bash/get-spec-paths.sh --json
  ps: src/scripts/powershell/get-spec-paths.ps1 -Json
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/plan` to design implementation approach. `($ARGUMENTS)` contains optional planning instructions or constraints.

**Your task**: Create a comprehensive implementation plan that defines HOW to build what's specified in the spec, completely replacing plan.yaml on every run.

**Key guidelines**:

1. **Script Execution & Context Loading**: Run `{SCRIPT}` FROM CURRENT WORKING DIRECTORY AND NEVER FROM SOMEWHERE ELSE! Parse JSON response to extract **SPEC_DIR**. **NEVER proceed** if script fails - display the error message to the user, explain that the `.buildforce` directory was not found, suggest: 1) check if you're in the buildforce root directory (where you ran `buildforce init`), 2) run `buildforce init .` if needed. Load {SPEC_DIR}/spec.yaml into context. **NEVER proceed** without spec.yaml loaded. Check if {SPEC_DIR}/plan.yaml exists and has content beyond template to determine if this is first plan or iteration.

2. **Parse User Instructions**: Parse $ARGUMENTS for planning instructions or constraints. User instructions take priority—incorporate them when making design decisions and planning implementation.

3. **Make Design Decisions**: Address architecture approach, technology/library choices (justify each), design patterns, data/state management, and file organization. Consider existing codebase patterns and conventions.

4. **Generate Implementation Plan**: Populate {SPEC_DIR}/plan.yaml using plan-template.yaml structure with phases, tasks (checkboxes, spec_refs, files), validation checklists, testing guidance, and risks. **ALWAYS link tasks to spec requirements via spec_refs**. Completely replace plan.yaml content on every /plan run (no iteration tracking).

5. **Validate Plan Against Spec**: Ensure every spec requirement (FR*, NFR*, AC\*) is addressed by at least one task. Verify spec_coverage mapping is complete, no contradictions exist, and scope is realistic.

6. **Present Plan to User**: Use fixed output format structure below. Include **all phase tasks in full detail** (checkboxes, spec_refs, files) to provide complete context and prevent hallucination during /build.

   **Format**:

   - **Architecture Overview**: One concise paragraph describing high-level approach and how pieces fit together
   - **Design Decisions**: Bulleted list with "**Decision**: X → **Rationale**: Y (alternatives considered)" structure
   - **File Structure**: Two lists (files to create, files to modify with change descriptions)
   - **Implementation Phases**: Numbered phases with task lists showing `[ ]` checkboxes, spec_refs arrays, files arrays for each task
   - **Testing Strategy**: Automated tests (file, what, command) and manual tests (scenario, steps)
   - **Risks & Considerations**: List of risks paired with mitigation strategies

7. **Request User Approval**: After presenting plan, ask user for approval or feedback on design decisions. User is ultimate decision maker. Suggest running `/build` if approved, or refining plan via another `/plan` call if changes needed.

Context: {$ARGUMENTS}
