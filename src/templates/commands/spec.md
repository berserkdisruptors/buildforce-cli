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

1. **Determine create vs update mode**: Read and follow the pattern described in `.buildforce/templates/shared/create-update-pattern.md` from the buildforce root directory.

   - Priority 1: Check conversation history for existing spec
   - Priority 2: Run `{SCRIPT}` FROM CURRENT WORKING DIRECTORY AND NEVER FROM SOMEWHERE ELSE! Parse JSON output for FOLDER_NAME, SPEC_FILE, SPEC_DIR, FEATURE_NUM, and IS_UPDATE flag. **NEVER proceed** if script fails - display the error message to the user, explain that the `.buildforce` directory was not found, suggest: 1) check if you're in the buildforce root directory (where you ran `buildforce init`), 2) run `buildforce init .` if needed.

   - Read `.buildforce/.current-spec` file from repo root
   - If file exists and has content (non-empty folder name): **UPDATE mode** - Load existing spec from that folder
   - If file doesn't exist or is empty: **CREATE mode** - Generate new folder name and create new spec

2. **For CREATE mode (new spec)**:

   **Step 2a: Generate folder name**:

   - **Extract semantic slug**: Analyze the user's feature description and extract 3-5 key words that capture the intent
   - **Format semantic slug**: Convert to kebab-case, max 35 characters, lowercase alphanumeric and hyphens only, must start with a letter
     - Examples: "add-auth-jwt", "refactor-error-handling", "implement-caching"
   - **Get UTC timestamp**: Generate current UTC timestamp in format YYYYMMDDHHmmss (14 digits)
     - Use the current conversation timestamp for consistency
   - **Combine**: Append timestamp to slug with hyphen separator
     - Format: `{semantic-slug}-{timestamp}`
     - Example: `add-auth-jwt-20250122143052`
   - **Validate**: Ensure total length ≤50 characters (35 for slug + 1 hyphen + 14 for timestamp)
   - **Set {FOLDER_NAME}**: Replace {FOLDER_NAME} in the script command with your generated folder name

   **Step 2b: Run script and create spec**:

   - Run `{SCRIPT}` with generated FOLDER_NAME and parse JSON output for FOLDER_NAME, SPEC_FILE, SPEC_DIR

   **Step 2c: Populate spec file**:

   - Load `.buildforce/templates/spec-template.yaml` from the current working directory to understand structure and fields
   - Populate all sections based on placeholder text, YAML comments, and field names
   - For metadata: Set id = "{FOLDER_NAME}" (the full slug-timestamp you generated), status = "draft", dates = today YYYY-MM-DD
   - For content: Derive from feature description and prerequisite context
   - Ensure requirements use unique IDs (FR1, FR2, ..., NFR1, ..., AC1, ...)
   - **CRITICAL**: Never leave placeholders like [FEATURE_NUM] - use `open_questions` section for unclear items
   - **CRITICAL**: Actively populate `open_questions` with any ambiguities, unknowns, or items needing clarification

3. **For UPDATE mode (existing spec)**:

   - Read folder name from `.buildforce/.current-spec`
   - Load existing spec.yaml from `.buildforce/specs/{folder-name}/spec.yaml`
   - Preserve all existing field values (id, created date, etc.)
   - Update `last_updated` to today's date
   - Intelligently merge new information from $ARGUMENTS:
     - Add new requirements to existing requirement sections (maintain sequential IDs)
     - Append to `notes` or `open_questions` sections if clarifying existing content
     - Update specific fields if $ARGUMENTS explicitly requests changes
     - Do NOT duplicate or contradict existing requirements
   - Report what changed with specific examples (e.g., "Added FR5-FR7 for error handling", "Updated open_questions with database choice")

4. **Validate Prerequisite Context**:

   - Check if sufficient context exists from previous `/research` commands in this conversation
   - If critical information is missing, suggest running `/research` first

5. **Identify Ambiguities & Clarifying Questions** (CRITICAL STEP):

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

6. **Behavior rules**:

   - Focus on WHAT, not HOW (avoid implementation details unless they're constraints)
   - Ensure all requirements are testable and measurable
   - Keep scope incremental (single, focused change)
   - Check for contradictions between different requirements

7. **Report completion**:

   **If spec has open questions:**

   - Report folder name and spec file path
   - Present the open questions list to the user with clear formatting
   - Ask user to provide answers/clarifications
   - Explain: "I'll wait for your input before we proceed to planning."
   - Do NOT suggest `/plan` yet - questions must be resolved first

   **If NO open questions (or after questions are resolved):**

   - If NEW spec: Report folder name, spec file path, and suggest: "Ready to create a plan? Run `/plan` to design the implementation approach."
   - If UPDATE: Summarize changes made and ask: "Does this capture your updates? Run `/plan` when ready to design the implementation."
