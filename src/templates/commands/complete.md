---
description: Finalize the current spec by creating context files, updating the context repository, and clearing the spec state.
scripts:
  sh: src/scripts/bash/complete-spec.sh --json
  ps: src/scripts/powershell/complete-spec.ps1 -Json
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/complete` to finalize the current spec. ($ARGUMENTS) contains optional completion notes or confirmations.

**Your task**: Complete the spec by creating comprehensive context files, updating the context repository, and validating that all requirements have been met.

**Key guidelines**:

1. **Script Execution & Verification**: Run `{SCRIPT}` from repo root. Parse JSON response to extract SPEC_DIR, SPEC_ID, CONTEXT_FILE, ARTIFACTS, and RELATED_CONTEXTS. **NEVER proceed** if script failsuser must run /spec first.

2. **Artifact Analysis**: Read ALL files listed in ARTIFACTS array from the script output. Do not assume only spec.yml and plan.yml existthe script discovers all files dynamically. Understand what was specified, planned, and implemented.

3. **Conversation Analysis**: Review the current conversation to extract key design decisions, implementation changes, deviations from the original plan, and any important context not captured in the artifact files.

4. **Context File Naming Strategy**: **CRITICAL** - Context files use semantic naming decoupled from spec IDs.

   - **Read existing context files**: Load `.buildforce/context/_index.yml` to see all existing context files
   - **Analyze components touched**: Review conversation history, spec.yaml, and plan.yaml to identify which system components/features/modules were actually modified
   - **Determine update vs create**:
     - If an existing context file covers the same component → UPDATE that file (do not create duplicate)
     - If existing file is >500 lines → Consider decomposing into smaller focused files
     - Only CREATE new file if this represents a new component not yet documented
   - **Generate semantic filename** (for new files only):
     - Use component/feature/module identity, NOT spec intent
     - Format: kebab-case, max 50 characters, no numeric or timestamp prefixes
     - Examples: `authentication.yml`, `build-command.yml`, `error-handling.yml`
     - Validate: lowercase alphanumeric and hyphens only
   - **Multiple components**: One spec may touch multiple contexts → update multiple files

5. **Context File Generation**: The script created a template context file at CONTEXT_FILE. Load this file and populate ALL sections based on:

   - Schema structure from `.buildforce/context/_schema.yml` (dynamically loaded by script)
   - Information from spec artifacts (requirements, dependencies, files modified)
   - Conversation insights (design decisions, rationale, evolution)
     **CRITICAL**: Use schema as reference for structure, but populate with actual project information. Do NOT leave placeholder text like "[Agent will populate]"fill in real content.

6. **Index Update**: Verify that `.buildforce/context/_index.yml` has been updated with the new context entry. Check that the id, file, type, and tags are correct. Suggest tag improvements if the automatically generated tags are too generic.

7. **Related Context Updates**: If RELATED_CONTEXTS array is not empty, read each related context file and determine if it needs updates based on the current spec's changes. Update files where dependencies or cross-references should be added. Preserve existing content while adding new relationships.

8. **Validation & Confirmation**: Present a completion report with:
   - Spec ID and name
   - Context file created
   - Summary of what was captured from artifacts and conversation
   - Related contexts updated (if any)
   - Confirmation that all spec requirements were implemented
     **ALWAYS** request user confirmation before finalizing. If user approves, the spec state is already cleared by the script. If issues found, suggest fixes before clearing state.

Context: {$ARGUMENTS}
