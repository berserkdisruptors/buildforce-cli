---
description: Create or update a structured specification YAML file that captures WHAT needs to be built.
scripts:
  sh: src/scripts/bash/create-spec-files.sh --folder-name "{FOLDER_NAME}" --json
  ps: src/scripts/powershell/create-spec-files.ps1 -FolderName "{FOLDER_NAME}" -Json
---

The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

$ARGUMENTS

The text the user typed after `/spec` in the triggering message **is** the feature description. Assume you always have it available in this conversation even if `{ARGS}` appears literally below. Do not ask the user to repeat it unless they provided an empty command.

## Workflow Steps

1. **Determine CREATE vs UPDATE mode**:

   Check if there's an active spec in the current session:

   - Read `.buildforce/.current-spec` file from repo root
   - If file exists and has content (non-empty folder name): **UPDATE mode** - Load existing spec and plan from that folder
   - If file doesn't exist or is empty: **CREATE mode** - Generate new folder name and create new spec and plan

2. **For CREATE mode (new spec)**:

   **Step 2a: Generate folder name**:

   - **Extract semantic slug**: Analyze the user's feature description and extract 3-5 key words that capture the intent
   - **Format semantic slug**: Convert to kebab-case, max 35 characters, lowercase alphanumeric and hyphens only
     - Examples: "add-auth-jwt", "refactor-error-handling", "implement-caching"
   - **Get UTC timestamp**: Generate current UTC timestamp in format YYYYMMDDHHmmss (14 digits)
     - Use the current conversation timestamp for consistency
   - **Combine**: Prepend timestamp to slug with hyphen separator
     - Format: `{timestamp}-{semantic-slug}`
     - Example: `20250122143052-add-auth-jwt`
   - **Validate**: Ensure total length ≤50 characters
   - **Set {FOLDER_NAME}**: Replace {FOLDER_NAME} in the script command with your generated folder name

   **Step 2b: Run script to create folder and files**:

   - Run `{SCRIPT}` with generated FOLDER_NAME and parse JSON output for FOLDER_NAME, SPEC_FILE, PLAN_FILE, SPEC_DIR
   - The script creates both spec.yaml and plan.yaml files from templates

   **Step 2c: Populate both spec.yaml and plan.yaml**:

   **For spec.yaml (WHAT to build)**:

   - Load `src/templates/spec-template.yaml` to understand structure
   - Populate with requirements, scope, goals, acceptance criteria (WHAT content)
   - For metadata: Set id = "{FOLDER_NAME}", status = "draft", dates = today YYYY-MM-DD
   - Ensure requirements use unique IDs (FR1, FR2, ..., NFR1, ..., AC1, ...)
   - **CRITICAL**: Actively populate `open_questions` with any requirement ambiguities or missing details
   - Focus on WHAT needs to be built, not HOW to build it

   **For plan.yaml (HOW to build)**:

   - Load `src/templates/plan-template.yaml` to understand structure
   - Populate with architecture, technical decisions, implementation phases, tasks (HOW content)
   - Set spec_id = "{FOLDER_NAME}", link tasks to spec requirements via spec_refs
   - Include technology choices, design patterns, file structure, testing strategy
   - Focus on HOW to implement the requirements from spec.yaml

3. **For UPDATE mode (existing spec)**:

   **Intelligent routing** - Determine which file(s) to update based on user input:

   - Read folder name from `.buildforce/.current-spec`
   - Load both existing spec.yaml and plan.yaml from `.buildforce/specs/{folder-name}/`
   - Analyze $ARGUMENTS to determine content type:
     - **Requirements/scope/goals** → Update spec.yaml only
     - **Architecture/tech decisions/phases** → Update plan.yaml only
     - **Mixed content** → Update both files appropriately
   - Preserve all existing field values (id, created date, etc.)
   - Update `last_updated` to today's date in modified file(s)
   - For spec.yaml updates:
     - Add new requirements with sequential IDs (maintain FR1, FR2, ... sequence)
     - Update `open_questions` if new ambiguities identified
     - Do NOT duplicate or contradict existing requirements
   - For plan.yaml updates:
     - Add/modify technical decisions, phases, or tasks
     - Update spec_refs to link new tasks to requirements
     - Do NOT contradict existing architectural decisions without explicit reasoning
   - Report what changed with specific examples (e.g., "Added FR5-FR7 for error handling to spec.yaml", "Updated plan.yaml Phase 2 with new database migration tasks")

4. **Identify Ambiguities & Clarifying Questions** (CRITICAL STEP):

   This is a key quality gate - do NOT skip this step.

   **Before writing the spec and plan:**

   - Analyze the feature description for vague, ambiguous, or incomplete information
   - Identify assumptions that need validation (both requirements AND technical)
   - Note any missing details, edge cases, or constraints
   - If the intent is too vague, ask clarifying questions BEFORE creating the spec

   **When creating the spec and plan:**

   - Use spec.yaml `open_questions` for requirement ambiguities
   - Questions can cover both WHAT (requirements) and HOW (technical decisions)
   - Do NOT make assumptions to fill gaps - explicitly list unknowns
   - Examples:
     - Requirements: "Should user sessions persist across browser restarts?"
     - Technical: "Which database migration tool should we use?"
     - Architecture: "Should we use REST or GraphQL for the API?"

   **After writing the spec and plan:**

   - Review both files for completeness
   - If `open_questions` has items, present them to the user NOW
   - Format: "I've created the spec and plan, but need clarification on these points:"
   - Wait for user responses and update files accordingly
   - **NEVER present plan summary if open questions exist**

5. **Behavior rules**:

   - spec.yaml focuses on WHAT (requirements, scope, goals, acceptance criteria)
   - plan.yaml focuses on HOW (architecture, tech stack, implementation approach)
   - Ensure all requirements are testable and measurable
   - Keep scope incremental (single, focused change)
   - Check for contradictions between spec requirements and plan implementation

6. **Report completion**:

   **If spec has open questions:**

   - Report folder name, spec file path, and plan file path
   - Present the open questions list to the user with clear formatting
   - Ask user to provide answers/clarifications
   - Explain: "I'll wait for your input before presenting the implementation plan."
   - Do NOT present plan summary yet - questions must be resolved first

   **If NO open questions (or after questions are resolved):**

   Present a **condensed plan summary** using this format:

   ```
   ## Implementation Plan Summary

   1. **[Phase 1 Name]**
      - [Key task 1]
      - [Key task 2]
      - [Key task 3]

   2. **[Phase 2 Name]**
      - [Key task 1]
      - [Key task 2]
      - [Key task 3]

   3. **[Phase 3 Name]**
      - [Key task 1]
      - [Key task 2]
      - [Key task 3]

   **Key Architecture Decisions:**
   - [Decision 1]: [Brief rationale]
   - [Decision 2]: [Brief rationale]

   **Testing Strategy:** [One sentence summary]

   **Risks:** [One sentence summary of main risks]
   ```

   Then suggest: **"Ready to code? Run `/build` to start implementation."**

   **For UPDATE mode**: Summarize changes made to spec.yaml and/or plan.yaml, present updated condensed plan summary if plan changed, and suggest: "Ready to code? Run `/build` to start implementation."

   **IMPORTANT**: Every subsequent `/spec` invocation updates BOTH files based on intelligent routing of the user's input content. Raw user input with explicit `/spec` invocation might also intent to update BOTH so decide accordingly.
