---
description: Finalize the current spec by creating context files, updating the context repository, and clearing the spec state.
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/complete` to finalize the current spec. ($ARGUMENTS) contains optional completion notes or confirmations.

**Your task**: Complete the spec by creating comprehensive context files, updating the context repository, validating that all requirements have been met, and clearing the spec state.

## Workflow Steps

1. **Verify Active Spec**:

   Check if there's an active spec to complete:

   - Read `.buildforce/.current-spec` file from repo root
   - If file doesn't exist or is empty: **ERROR** - Reply that there is no active spec and user must run `/spec` first
   - If file has content (folder name): **PROCEED** - Extract folder name and continue

2. **Load Spec Artifacts**:

   Load the spec and plan files from the active spec folder:

   - Construct spec directory path: `.buildforce/specs/{folder-name}/` where folder-name comes from `.current-spec`
   - Read `spec.yml` from spec directory
   - Read `plan.yml` from spec directory if it exists
   - Parse key metadata: spec id, name, requirements, dependencies, files modified
   - Understand what was specified, planned, and implemented

3. **Analyze Context Requirements**:

   Do a proactive search to determine which context files need updates or creation:

   - **Read `.buildforce/context/_index.yml`** to see all existing context files
   - **Analyze spec and plan** to identify which system components/features/modules were actually modified
   - **Review conversation history** to extract key design decisions, implementation changes, and deviations
   - **Determine update vs create** for each component:
     - If existing context file covers the same component → **UPDATE** that file (do not create duplicate)
     - If existing file is >500 lines → Consider decomposing into smaller focused files
     - If this represents new component not yet documented → **CREATE** new file
   - **Multiple components**: One spec may touch multiple contexts → update/create multiple files

4. **Generate Context Filenames** (for new files only):

   **CRITICAL** - Context files use semantic naming decoupled from spec IDs.

   - Use component/feature/module identity, NOT spec intent
   - Format: kebab-case, max 50 characters, no numeric or timestamp prefixes
   - Examples: `authentication.yml`, `build-command.yml`, `error-handling.yml`, `plan-template.yml`
   - Validate: lowercase alphanumeric and hyphens only
   - **Check for ID conflicts**: Search `_index.yml` to ensure generated ID doesn't already exist
   - If conflict exists: Choose alternative ID (append descriptor, use synonym)

5. **Create/Update Context Files**:

   **For NEW context files**:

   - Load `.buildforce/context/_schema.yml` to understand required structure and fields
   - Create new file at `.buildforce/context/{generated-filename}.yml`
   - Populate ALL schema sections with actual context from the current spec session
   - **NEVER leave placeholder text** like "[Agent will populate]" - fill in real content

   **For EXISTING context files**:

   - Read current content from `.buildforce/context/{filename}.yml`
   - Preserve all existing values (id, created date, version history)
   - Update `last_updated` to today's date
   - Intelligently merge new information:
     - Add new dependencies if discovered
     - Append to `files` sections if new files were modified
     - Add new entry to `evolution` section with version bump, date, and changes
     - Append current spec ID to `related_specs` array
     - Update `design_decisions` if new decisions were made
     - Append to `notes` if additional context exists
   - Do NOT duplicate existing content or contradict existing information

6. **Update Context Index**:

   Update `.buildforce/context/_index.yml` with new entries:

   - For each NEW context file created, add entry:
     ```yaml
     - id: {semantic-id}
       file: {filename}.yml
       type: {module/feature/component/pattern}
       description: {short-one-liner-description}
       tags: [{auto-generated-tags}]
       related_context: [{related-context-ids}]  # OPTIONAL
     ```
   - **Description field**: Provide a generic, stable one-liner (max 100 chars) describing WHAT this component/feature/module IS - focus on its identity and purpose, not implementation details or achievements. Should remain relevant across versions and evolution.
   - **Generate tags** based on component analysis (e.g., [core, workflow, agents] for slash-commands)
   - **Related context field** (OPTIONAL): Add array of closely related context IDs for discovery
     - Include for: feature families, dependent modules, sibling features
     - Only add significant relationships (avoid over-populating)
     - IDs must exist in _index.yml
     - Example: `[slash-commands, plan-template, spec-command]`
   - Maintain proper YAML indentation (2 spaces per level)
   - Preserve existing entries (do not modify or delete)
   - For EXISTING context files, no index update needed (entry already exists)

7. **Validate Implementation**:

   Confirm that all spec requirements were met:

   - Cross-check implementation against spec's functional requirements (FR1, FR2, ...)
   - Verify non-functional requirements were addressed (NFR1, NFR2, ...)
   - Confirm acceptance criteria were satisfied (AC1, AC2, ...)
   - Check that plan was followed or deviations were logged
   - If requirements are missing or incomplete: **ALERT USER** before finalizing

8. **Clear Spec State**:

   Mark the spec as complete:

   - Delete `.buildforce/.current-spec` file from repo root
   - This signals that no active spec is in progress

9. **Present Completion Summary**:

   Provide a concise report to the user:

   - Spec ID and name that was completed
   - List of context files created (if any) with filenames
   - List of context files updated (if any) with what was added
   - Confirmation that all spec requirements were implemented
   - Brief summary of what was achieved with this spec (1-2 sentences)
   - **ALWAYS request user confirmation** that the completion is satisfactory

## Behavior Rules

- Focus on comprehensive documentation - capture all design decisions and rationale
- Use semantic naming that reflects component identity, not spec intent
- Update existing context files rather than creating duplicates
- Validate that all spec requirements are met before finalizing
- Clear and concise summaries - users should quickly understand what was achieved
- When in doubt about context file boundaries, prefer smaller focused files over large monoliths

## Example Flow

**CREATE mode** (new component):

```
1. Read .current-spec → "20250123150000-add-auth"
2. Load spec.yaml and plan.yaml from .buildforce/specs/20250123150000-add-auth/
3. Analyze: Introduced new authentication module
4. Check _index.yml: No existing "authentication" context
5. Generate filename: "authentication.yml"
6. Load _schema.yml template
7. Create .buildforce/context/authentication.yml with full content
8. Add entry to _index.yml
9. Delete .current-spec
10. Report: "Created authentication.yml context file for new auth module"
```

**UPDATE mode** (existing component):

```
1. Read .current-spec → "20250123160000-refactor-auth"
2. Load spec.yaml and plan.yaml
3. Analyze: Modified existing authentication module
4. Check _index.yml: Found existing "authentication.yml"
5. Read existing authentication.yml
6. Add evolution entry, update files list, append to related_specs
7. No index update needed (entry exists)
8. Delete .current-spec
9. Report: "Updated authentication.yml with refactoring changes"
```

**MIXED mode** (multiple components):

```
1. Read .current-spec → "20250123170000-add-feature-x"
2. Load spec.yaml and plan.yaml
3. Analyze: Modified auth module, created new config module, touched error handling
4. Check _index.yml: Found "authentication.yml" and "error-handling.yml", no "config-management.yml"
5. UPDATE authentication.yml and error-handling.yml
6. CREATE config-management.yml
7. Add config-management entry to _index.yml
8. Delete .current-spec
9. Report: "Updated 2 context files (authentication, error-handling) and created 1 new file (config-management)"
```
