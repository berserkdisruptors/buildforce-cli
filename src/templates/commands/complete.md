---
version: "0.0.42"
description: Finalize the current spec by creating context files, updating the context repository, and clearing the spec state.
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/buildforce.complete` to finalize the current spec. ($ARGUMENTS) contains optional completion notes or confirmations.

**Your task**: Complete the spec by creating comprehensive context files, updating the context repository, validating that all requirements have been met, and clearing the spec state.

## Workflow Steps

1. **Verify Active Spec**:

   Check if there's an active spec to complete:

   - Read `.buildforce/buildforce.json` file from current working directory and parse the `currentSession` field
   - If file doesn't exist or `currentSession` is null/empty: **ERROR** - Reply that there is no active spec and user must run `/buildforce.plan` first
   - If `currentSession` field has a value (folder name): **PROCEED** - Extract folder name and continue

2. **Load Spec Artifacts**:

   Load the spec and plan files from the active spec folder:

   - Construct spec directory path: `.buildforce/sessions/{folder-name}/` where folder-name comes from `buildforce.json` `currentSession` field
   - Read `spec.yaml` from spec directory
   - Read `plan.yaml` from spec directory if it exists
   - Read `research.yaml` from spec directory if it exist
   - Parse key metadata: spec id, name, requirements, dependencies, files modified
   - Understand what was specified, planned, and implemented
   - **Status Update**: Update the `status` field in both `spec.yaml` and `plan.yaml` to "completed" and set `last_updated` to today's date (YYYY-MM-DD format)

3. **Analyze Context Requirements**:

   Do a proactive search to determine which context files need updates or creation:

   - **Read `.buildforce/context/_index.yaml`** - this unified index contains all context entries organized by domain:
     - `domains.architecture.items[]` - architecture context entries (files in `architecture/`)
     - `domains.conventions.items[]` - convention context entries (files in `conventions/`)
     - `domains.verification.items[]` - verification context entries (files in `verification/`)
   - **Search `domains.architecture.items`** to see existing architecture context files
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
   - **Check for ID conflicts**: Search `_index.yaml` `domains.architecture.items` to ensure generated ID doesn't already exist
   - If conflict exists: Choose alternative ID (append descriptor, use synonym)

5. **Create/Update Context Files**:

   **For NEW context files**:

   - Load `.buildforce/context/architecture/_schema.yaml` to understand required structure and fields
   - Create new file at `.buildforce/context/architecture/{generated-filename}.yaml`
   - Set type: "structural" (required for all architecture context)
   - Populate ALL schema sections with actual context from the current spec session
   - **NEVER leave placeholder text** like "[Agent will populate]" - fill in real content

   **For EXISTING context files**:

   - Read current content from `.buildforce/context/architecture/{filename}.yaml`
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

   Update `.buildforce/context/_index.yaml` `domains.architecture.items` with new entries:

   - For each NEW context file created, add entry to `domains.architecture.items[]`:
     ```yaml
     - id: {semantic-id}
       file: architecture/{filename}.yaml
       type: structural
       status: extracted
       depth: shallow
       description: {short-one-liner-description}
       tags: [{auto-generated-tags}]
       related_context: [{related-context-ids}]  # OPTIONAL
     ```
   - **Description field**: Provide a generic, stable one-liner (max 100 chars) describing WHAT this component/feature/module IS - focus on its identity and purpose, not implementation details or achievements. Should remain relevant across versions and evolution.
   - **Generate tags** based on component analysis (e.g., [core, workflow, agents] for slash-commands)
   - **Related context field** (OPTIONAL): Add array of closely related context IDs for discovery
     - Include for: feature families, dependent modules, sibling features
     - Only add significant relationships (avoid over-populating)
     - IDs must exist in `domains.architecture.items`
     - Example: `[slash-commands, plan-template, spec-command]`
   - **Update summary counts**: Increment `summary.total_items` and `summary.extracted_items`
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

8. **Pattern Detection & Convention Auto-Update** (Optional Enhancement):

   Analyze implemented code for emerging conventions and suggest additions to conventions/:

   **Check for Conventions System**:
   - Check if `.buildforce/context/conventions/` folder exists
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
      - Pattern is NOT already documented in existing conventions
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
      - Suggest appropriate sub_type (architectural-pattern, code-convention, etc.)
      - Suggest enforcement level (default: `recommended` for safety)
      - Draft convention file content with minimal example (5-10 lines)

   **Present Detected Patterns to User**:

   If patterns detected, present them BEFORE clearing spec state:

   ```
   ## Convention Updates

   The following conventions were detected and can be added to conventions/:

   ### Detected Pattern 1: [Pattern Name]
   - **Detected in**: 7 files (98% consistency)
   - **Category**: [sub_type value]
   - **Example files**: [src/services/UserService.ts, src/services/PostService.ts, src/services/OrderService.ts]
   - **Suggested enforcement**: recommended
   - **Preview**:
     ```yaml
     id: [pattern-id]
     name: "[Pattern Name]"
     type: convention
     sub_type: [sub-type]
     enforcement: recommended
     description: |
       [Pattern description extracted from analysis]
     examples:
       - file: "src/services/UserService.ts"
         snippet: |
           [5-10 line code snippet showing pattern]
     reference_files:
       - "src/services/UserService.ts"
       - "src/services/PostService.ts"
     ```

   Would you like to add these patterns to conventions/? (Y/n)
   ```

   **User Confirmation Workflow**:

   - **If user confirms (Y or yes)**:
     1. For each confirmed pattern:
        - Generate filename from pattern name (kebab-case, e.g., "repository-pattern.yaml")
        - Create `.buildforce/context/conventions/{filename}.yaml` with full convention content
        - Set type: "convention" and appropriate sub_type
        - Set enforcement to `recommended` (users can upgrade to strict later)
        - Include reference_files array from detected files
     2. Update `.buildforce/context/_index.yaml` `domains.conventions.items` with new entries
     3. Update `summary.total_items` and `summary.extracted_items` counts
     4. Report: "Added [N] new conventions: [list filenames with enforcement levels]"

   - **If user declines (n or no)**:
     1. Skip auto-update
     2. Optionally mention: "You can manually add these patterns later via `/buildforce.document conventions`"
     3. Continue to next step

   - **CRITICAL**: Never auto-update without explicit user confirmation. This builds trust and prevents accidental convention capture.

   **Pattern Detection Performance**:
   - Keep analysis focused on modified files from current spec only
   - Do not scan entire codebase (too expensive)
   - If pattern detection takes >10 seconds, skip and mention: "Pattern detection skipped due to complexity - use `/buildforce.document scan conventions` for full codebase analysis"

9. **Clear Spec State**:

   Mark the spec as complete:

   - Read `.buildforce/buildforce.json` and set the `currentSession` field to `null`
   - This signals that no active spec is in progress
   - The `buildforce.json` file is preserved for future specs

10. **Present Completion Summary**:

Provide a concise report to the user:

- Spec ID and name that was completed
- List of context files created (if any) with filenames
- List of context files updated (if any) with what was added
- **If patterns were detected and added**: Report convention additions (e.g., "Added 2 new conventions to conventions/: repository-pattern.yaml (recommended), error-handling-pattern.yaml (recommended)")
- Confirmation that all spec requirements were implemented
- Brief summary of what was achieved with this spec (1-2 sentences)

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
1. Read buildforce.json currentSession → "20250123150000-add-auth"
2. Load spec.yaml and plan.yaml from .buildforce/sessions/20250123150000-add-auth/
3. Analyze: Introduced new authentication module
4. Check _index.yaml domains.architecture.items: No existing "authentication" context
5. Generate filename: "authentication.yaml"
6. Load architecture/_schema.yaml template
7. Create .buildforce/context/architecture/authentication.yaml with full content (type: structural)
8. Add entry to _index.yaml domains.architecture.items, update summary counts
9. Clear currentSession in buildforce.json (set to null)
10. Report: "Created authentication.yaml context file in architecture/ for new auth module"
```

**UPDATE mode** (existing component):

```
1. Read buildforce.json currentSession → "20250123160000-refactor-auth"
2. Load spec.yaml and plan.yaml
3. Analyze: Modified existing authentication module
4. Check _index.yaml domains.architecture.items: Found existing "authentication.yaml"
5. Read existing architecture/authentication.yaml
6. Add evolution entry, update files list, append to related_specs
7. No index update needed (entry exists)
8. Clear currentSession in buildforce.json (set to null)
9. Report: "Updated architecture/authentication.yaml with refactoring changes"
```

**MIXED mode** (multiple components):

```
1. Read buildforce.json currentSession → "20250123170000-add-feature-x"
2. Load spec.yaml and plan.yaml
3. Analyze: Modified auth module, created new config module, touched error handling
4. Check _index.yaml domains.architecture.items: Found "authentication" and "error-handling", no "config-management"
5. UPDATE architecture/authentication.yaml and architecture/error-handling.yaml
6. CREATE architecture/config-management.yaml (type: structural)
7. Add config-management entry to _index.yaml domains.architecture.items, update summary counts
8. Clear currentSession in buildforce.json (set to null)
9. Report: "Updated 2 context files (authentication, error-handling) and created 1 new file (config-management)"
```
