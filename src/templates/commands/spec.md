---
description: Create or update a structured specification YAML file that captures WHAT needs to be built.
scripts:
  sh: src/scripts/bash/create-spec.sh --json "{ARGS}"
  ps: src/scripts/powershell/create-spec.ps1 -Json "{ARGS}"
---

The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

$ARGUMENTS

The text the user typed after `/spec` in the triggering message **is** the feature description. Assume you always have it available in this conversation even if `{ARGS}` appears literally below. Do not ask the user to repeat it unless they provided an empty command.

## Workflow Steps

1. **Determine create vs update mode**: Follow the pattern in `src/templates/shared/create-update-pattern.md`

   - Priority 1: Check conversation history for existing spec
   - Priority 2: Run `{SCRIPT}` and parse JSON output for FOLDER_NAME, SPEC_FILE, SPEC_DIR, FEATURE_NUM, and IS_UPDATE flag

2. **For CREATE mode (IS_UPDATE = false)**:

   - Load `src/templates/spec-template.yaml` to understand structure and fields
   - Populate all sections based on placeholder text, YAML comments, and field names
   - For metadata: Use standard conventions (id = "FEATURE_NUM-folder-name", status = "draft", dates = today YYYY-MM-DD)
   - For content: Derive from feature description and prerequisite context
   - Ensure requirements use unique IDs (FR1, FR2, ..., NFR1, ..., AC1, ...)
   - Never leave placeholders like [FEATURE_NUM] - use open_questions for unclear items

3. **For UPDATE mode (IS_UPDATE = true)**:

   - Read existing SPEC_FILE - preserve all existing values
   - Update `last_updated` to today's date
   - Intelligently merge new information from $ARGUMENTS (see shared pattern for details)
   - Report what changed with specific examples

4. **Validate Prerequisite Context**:

   - Check if sufficient context exists from previous `/research` commands in this conversation
   - If critical information is missing, suggest running `/research` first
   - If the intent is too vague or ambiguous, ask clarifying questions before proceeding

5. **Behavior rules**:

   - Focus on WHAT, not HOW (avoid implementation details unless they're constraints)
   - Ensure all requirements are testable and measurable
   - Keep scope incremental (single, focused change)
   - Check for contradictions or ambiguities

6. **Report completion**:
   - If NEW spec: Report folder name, spec file path, and suggest: "Ready to create a plan? Run `/plan` to design the implementation approach."
   - If UPDATE: Summarize changes made and ask: "Does this capture your updates? Run `/plan` when ready to design the implementation."
