---
version: "0.0.34"
description: Finalize the current spec by creating context files, updating the context repository, and clearing the spec state.
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/complete` to finalize the current spec. ($ARGUMENTS) contains optional completion notes or confirmations.

**Your task**: Complete the spec by creating comprehensive context files, updating the context repository, validating that all requirements have been met, and clearing the spec state.

## Workflow Steps

1. **Verify Active Spec**:

   Check if there's an active spec to complete:

   - Read `.buildforce/buildforce.json` file from current working directory and parse the `currentSpec` field
   - If file doesn't exist or `currentSpec` is null/empty: **ERROR** - Reply that there is no active spec and user must run `/buildforce.spec` first
   - If `currentSpec` field has a value (folder name): **PROCEED** - Extract folder name and continue

2. **Load Spec Artifacts**:

   Load the spec and plan files from the active spec folder:

   - Construct spec directory path: `.buildforce/specs/{folder-name}/` where folder-name comes from `buildforce.json` `currentSpec` field
   - Read `spec.yaml` from spec directory
   - Read `plan.yaml` from spec directory if it exists
   - Read `research.yaml` from spec directory if it exist
   - Parse key metadata: spec id, name, requirements, dependencies, files modified
   - Understand what was specified, planned, and implemented

3. **Analyze Context Requirements**:

   Do a proactive search to determine which context files need updates or creation:

   - **Read `.buildforce/context/_index.yaml`** to see all existing context files
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
   - Examples: `authentication.yaml`, `build-command.yaml`, `error-handling.yaml`, `plan-template.yaml`
   - Validate: lowercase alphanumeric and hyphens only
   - **Check for ID conflicts**: Search `_index.yaml` to ensure generated ID doesn't already exist
   - If conflict exists: Choose alternative ID (append descriptor, use synonym)

5. **Create/Update Context Files**:

   **For NEW context files**:

   - Load `.buildforce/context/_schema.yaml` to understand required structure and fields
   - Create new file at `.buildforce/context/{generated-filename}.yaml`
   - Populate ALL schema sections with actual context from the current spec session
   - **NEVER leave placeholder text** like "[Agent will populate]" - fill in real content

   **For EXISTING context files**:

   - Read current content from `.buildforce/context/{filename}.yaml`
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

   Update `.buildforce/context/_index.yaml` with new entries:

   - For each NEW context file created, add entry:
     ```yaml
     - id: {semantic-id}
       file: {filename}.yaml
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
     - IDs must exist in \_index.yaml
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

8. **Pattern Detection & Guidelines Auto-Update** (Optional Enhancement):

   Analyze implemented code for emerging conventions and suggest additions to _guidelines.yaml:

   **Check for Guidelines System**:
   - Check if `.buildforce/context/_guidelines.yaml` exists
   - If missing: Skip pattern detection (system not initialized)
   - If exists: **PROCEED with pattern detection**

   **Analyze Files for Patterns**:

   Analyze files that were created or modified in the current spec for consistent patterns:

   1. **Get modified files list**:
      - Read `plan.yaml` to find files listed in `files_to_create` and `files_to_modify`
      - These are the files to analyze for patterns
      - Do NOT analyze entire codebase - focus on current spec implementation only

   2. **Pattern detection criteria**:
      - Pattern appears in **5+ files** from current spec
      - Implementation consistency **≥95%** (near-identical structure/approach)
      - Pattern is NOT already documented in existing _guidelines.yaml
      - Pattern represents intentional convention, not accidental similarity

   3. **Detectable pattern types**:
      - **Architectural patterns**: Class structures, module organization, design patterns (e.g., Repository pattern, Factory pattern)
      - **Naming conventions**: File/variable/function naming consistency (e.g., camelCase services, PascalCase components)
      - **Code conventions**: Error handling, transaction flows, API patterns (e.g., try-catch structure, validation approach)
      - **Testing patterns**: Test structure, mocking strategies, assertion patterns

   4. **For each detected pattern**:
      - Extract pattern name and description
      - Calculate occurrence count and consistency percentage
      - Identify 3-5 example files demonstrating the pattern
      - Suggest appropriate category (architectural_patterns, code_conventions, etc.)
      - Suggest enforcement level (default: `recommended` for safety)
      - Draft guideline entry in _guidelines.yaml format with minimal example (5-10 lines)

   **Present Detected Patterns to User**:

   If patterns detected, present them BEFORE clearing spec state:

   ```
   ## Guideline Updates

   ⚠️ The following conventions were detected and can be added to _guidelines.yaml:

   ### Detected Pattern 1: [Pattern Name]
   - **Detected in**: 7 files (98% consistency)
   - **Category**: [architectural_patterns/code_conventions/naming_conventions]
   - **Example files**: [src/services/UserService.ts, src/services/PostService.ts, src/services/OrderService.ts]
   - **Suggested enforcement**: recommended
   - **Preview**:
     ```yaml
     - pattern: "[Pattern Name]"
       description: |
         [Pattern description extracted from analysis]
       enforcement: recommended
       examples:
         - file: "src/services/UserService.ts"
           snippet: |
             [5-10 line code snippet showing pattern]
       reference_files:
         - "src/services/UserService.ts"
         - "src/services/PostService.ts"
     ```

   Would you like to add these patterns to _guidelines.yaml? (Y/n)
   ```

   **User Confirmation Workflow**:

   - **If user confirms (Y or yes)**:
     1. Read existing `.buildforce/context/_guidelines.yaml`
     2. For each confirmed pattern:
        - Append to appropriate category array
        - Use minimal example strategy (5-10 line snippets)
        - Include reference_files array from detected files
        - Set enforcement to `recommended` (users can upgrade to strict later)
     3. Update `last_updated` field to today's date (YYYY-MM-DD)
     4. Write updated _guidelines.yaml back to disk
     5. Report: "Added [N] new guidelines: [list pattern names with enforcement levels]"

   - **If user declines (n or no)**:
     1. Skip auto-update
     2. Optionally mention: "You can manually add these patterns later via `/document guidelines`"
     3. Continue to next step

   - **CRITICAL**: Never auto-update without explicit user confirmation. This builds trust and prevents accidental convention capture.

   **Pattern Detection Performance**:
   - Keep analysis focused on modified files from current spec only
   - Do not scan entire codebase (too expensive)
   - If pattern detection takes >10 seconds, skip and mention: "Pattern detection skipped due to complexity - use `/document scan guidelines` for full codebase analysis"

9. **Clear Spec State**:

   Mark the spec as complete:

   - Read `.buildforce/buildforce.json` and set the `currentSpec` field to `null`
   - This signals that no active spec is in progress
   - The `buildforce.json` file is preserved for future specs

10. **Present Completion Summary**:

Provide a concise report to the user:

- Spec ID and name that was completed
- List of context files created (if any) with filenames
- List of context files updated (if any) with what was added
- **If patterns were detected and added**: Report guideline additions (e.g., "Added 2 new guidelines to _guidelines.yaml: Repository Pattern (recommended), Error Handling Pattern (recommended)")
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
1. Read buildforce.json currentSpec → "20250123150000-add-auth"
2. Load spec.yaml and plan.yaml from .buildforce/specs/20250123150000-add-auth/
3. Analyze: Introduced new authentication module
4. Check _index.yaml: No existing "authentication" context
5. Generate filename: "authentication.yaml"
6. Load _schema.yaml template
7. Create .buildforce/context/authentication.yaml with full content
8. Add entry to _index.yaml
9. Clear currentSpec in buildforce.json (set to null)
10. Report: "Created authentication.yaml context file for new auth module"
```

**UPDATE mode** (existing component):

```
1. Read buildforce.json currentSpec → "20250123160000-refactor-auth"
2. Load spec.yaml and plan.yaml
3. Analyze: Modified existing authentication module
4. Check _index.yaml: Found existing "authentication.yaml"
5. Read existing authentication.yaml
6. Add evolution entry, update files list, append to related_specs
7. No index update needed (entry exists)
8. Clear currentSpec in buildforce.json (set to null)
9. Report: "Updated authentication.yaml with refactoring changes"
```

**MIXED mode** (multiple components):

```
1. Read buildforce.json currentSpec → "20250123170000-add-feature-x"
2. Load spec.yaml and plan.yaml
3. Analyze: Modified auth module, created new config module, touched error handling
4. Check _index.yaml: Found "authentication.yaml" and "error-handling.yaml", no "config-management.yaml"
5. UPDATE authentication.yaml and error-handling.yaml
6. CREATE config-management.yaml
7. Add config-management entry to _index.yaml
8. Clear currentSpec in buildforce.json (set to null)
9. Report: "Updated 2 context files (authentication, error-handling) and created 1 new file (config-management)"
```
