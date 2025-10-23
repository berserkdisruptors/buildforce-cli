---
description: Create or update a structured specification YAML file that captures WHAT needs to be built.
scripts:
  sh: src/scripts/bash/create-spec-files.sh --json --folder-name "{FOLDER_NAME}"
  ps: src/scripts/powershell/create-spec-files.ps1 -Json -FolderName "{FOLDER_NAME}"
---

The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

$ARGUMENTS

The text the user typed after `/spec` in the triggering message **is** the feature description. Assume you always have it available in this conversation even if `{ARGS}` appears literally below. Do not ask the user to repeat it unless they provided an empty command.

## Workflow Steps

1. **Generate folder name for new specs**:

   IMPORTANT: Before running the script, you MUST generate a folder name with timestamp prefix.

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

2. **Determine create vs update mode**: Read and follow the pattern described in `templates/shared/create-update-pattern.md` from repo root.

   - Priority 1: Check conversation history for existing spec
   - Priority 2: Run `{SCRIPT}` with generated FOLDER_NAME and parse JSON output for FOLDER_NAME, SPEC_FILE, SPEC_DIR
   - NOTE: The script no longer supports fuzzy matching or automatic spec reuse. Each /spec creates a new folder.

3. **For CREATE mode (new spec)**:

   - Load `templates/spec-template.yaml` from repo root to understand structure and fields
   - Populate all sections based on placeholder text, YAML comments, and field names
   - For metadata: Set id = "{FOLDER_NAME}" (the full timestamp-slug you generated), status = "draft", dates = today YYYY-MM-DD
   - For content: Derive from feature description and prerequisite context
   - Ensure requirements use unique IDs (FR1, FR2, ..., NFR1, ..., AC1, ...)
   - **CRITICAL**: Never leave placeholders like [FEATURE_NUM] - use `open_questions` section for unclear items
   - **CRITICAL**: Actively populate `open_questions` with any ambiguities, unknowns, or items needing clarification

4. **For UPDATE mode (existing spec in conversation)**:

   - Read existing SPEC_FILE - preserve all existing values
   - Update `last_updated` to today's date
   - Intelligently merge new information from $ARGUMENTS (see shared pattern for details)
   - Report what changed with specific examples

5. **Validate Prerequisite Context**:

   - Check if sufficient context exists from previous `/research` commands in this conversation
   - If critical information is missing, suggest running `/research` first

6. **Identify Ambiguities & Clarifying Questions** (CRITICAL STEP):

   This is a key quality gate - do NOT skip this step.

   **Before writing the spec:**

   - Analyze the feature description for vague, ambiguous, or incomplete information
   - Identify assumptions that need validation
   - Note any missing technical details, edge cases, or constraints
   - If the intent is too vague, ask clarifying questions BEFORE creating the spec

   **When creating the spec:**

   - The template includes an `open_questions` section - use it actively
   - Populate `open_questions` with specific, actionable questions that need answers
   - Do NOT make assumptions to fill gaps - explicitly list unknowns
   - Examples of good open questions:
     - "Should user sessions persist across browser restarts?"
     - "What happens to child records when parent is deleted?"
     - "Which OAuth providers should be supported initially?"
     - "What is the maximum file size for uploads?"

   **After writing the spec:**

   - Review the completed spec.yaml file you just created
   - Double-check that all ambiguities are captured in `open_questions`
   - If `open_questions` has items, present them directly to the user NOW
   - Format: "I've created the spec, but need clarification on these points:"
   - Wait for user responses and update the spec accordingly
   - Only suggest moving to `/plan` after all critical questions are resolved

7. **Behavior rules**:

   - Focus on WHAT, not HOW (avoid implementation details unless they're constraints)
   - Ensure all requirements are testable and measurable
   - Keep scope incremental (single, focused change)
   - Check for contradictions between different requirements

8. **Report completion**:

   **If spec has open questions:**

   - Report folder name and spec file path
   - Present the open questions list to the user with clear formatting
   - Ask user to provide answers/clarifications
   - Explain: "I'll wait for your input before we proceed to planning."
   - Do NOT suggest `/plan` yet - questions must be resolved first

   **If NO open questions (or after questions are resolved):**

   - If NEW spec: Report folder name, spec file path, and suggest: "Ready to create a plan? Run `/plan` to design the implementation approach."
   - If UPDATE: Summarize changes made and ask: "Does this capture your updates? Run `/plan` when ready to design the implementation."
