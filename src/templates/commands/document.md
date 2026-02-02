---
version: "0.0.43"
description: Create or update context files for existing functionality without requiring a spec-driven development session.
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/buildforce.document` to create or update context files in `.buildforce/context/` for functionality that already exists in the codebase. ($ARGUMENTS) contains the topic or module to document.

**Your task**: Document the existing functionality by analyzing conversation history, generating or updating context files following the schema structure, updating the context index, and maintaining cross-references with related contexts.

## Mode Detection

First, determine which mode to use based on $ARGUMENTS:

- **Conventions Mode**: If $ARGUMENTS contains "conventions" → Use Conventions Workflow (see below)
- **Scan Mode**: If $ARGUMENTS contains "scan conventions" → Use Conventions Scan Workflow (see below)
- **Standard Mode**: Otherwise → Use Standard Context Documentation Workflow (see below)

---

## Conventions Workflow

**Purpose**: Create or update convention context files in `.buildforce/context/conventions/` to capture project conventions, coding standards, and architectural patterns that AI agents should follow during implementation.

**When to use**:
- User explicitly invokes `/buildforce.document conventions`
- Conversation discusses project conventions, patterns, or standards
- Team wants to capture tribal knowledge for AI-assisted consistency

### Conventions Mode Steps

1. **Check for Existing Conventions**:
   - Check if `.buildforce/context/conventions/` folder exists and has convention files
   - Read `.buildforce/context/_index.yaml` and check `domains.conventions.items` to see existing conventions
   - If relevant convention exists → **UPDATE mode** (intelligent merge of new information)
   - If no relevant convention → **CREATE mode** (generate new convention file)

2. **Analyze Conversation for Conventions**:
   - Extract conventions discussed in conversation history
   - Identify which sub_type applies for each convention:
     - architectural-pattern: High-level structural pattern (e.g., Repository Pattern, CQRS)
     - code-convention: Specific coding standard (e.g., Error Handling, Async Patterns)
     - naming-convention: File, variable, function naming rules
     - testing-standard: Testing requirements and patterns
     - dependency-rule: Dependency management and architecture layer rules
     - security-requirement: Security-critical conventions that must be followed
     - performance-guideline: Performance-related conventions for optimization
     - accessibility-standard: Accessibility requirements for frontend code
     - project-quirk: Project-specific non-standard patterns with historical context
   - For each convention identified:
     - Determine appropriate enforcement level (strict/recommended/reference)
     - Extract or create minimal example (5-10 lines max)
     - Identify reference_files in codebase that demonstrate pattern
     - List common violations if discussed

3. **CREATE Mode - Generate New Convention File**:
   - Load `.buildforce/context/conventions/_schema.yaml` as reference
   - Generate filename from convention name (kebab-case, e.g., "repository-pattern.yaml")
   - Create `.buildforce/context/conventions/{filename}.yaml` with:
     - id: kebab-case identifier (e.g., "repository-pattern")
     - name: Human-readable name (e.g., "Repository Pattern")
     - type: "convention" (fixed value)
     - sub_type: Appropriate category from enum above
     - enforcement: strict | recommended | reference (default: recommended)
     - created: Today's date (YYYY-MM-DD)
     - last_updated: Today's date (YYYY-MM-DD)
     - description: Multi-line description of the convention
     - examples: Array of file/snippet pairs (5-10 line snippets)
     - violations: Array of what NOT to do
     - reference_files: Array of real codebase files demonstrating pattern
   - **NEVER leave template comments in final file** - only include actual content

4. **UPDATE Mode - Merge New Information**:
   - Read existing convention file from `.buildforce/context/conventions/`
   - Update `last_updated` field to today's date
   - For new information:
     - Add new examples if discovered
     - Add new violations if identified
     - Update reference_files if new examples found
     - Preserve existing structure and content
   - If new information conflicts with existing convention, notify user and ask for resolution

5. **Validate Convention Structure**:
   - Ensure YAML is valid (no syntax errors)
   - Verify all required fields present (id, name, type, sub_type, enforcement, created, last_updated, description)
   - Check enforcement level is valid (strict/recommended/reference)
   - Confirm type is "convention" and sub_type is from valid enum
   - Confirm examples are minimal (5-10 lines) if present
   - Validate reference_files point to actual codebase files

6. **Update Context Index** (CREATE mode only):
   - Add entry to `.buildforce/context/_index.yaml` `domains.conventions.items`:
     ```yaml
     - id: {convention-id}
       file: conventions/{filename}.yaml
       type: convention
       status: extracted
       depth: shallow
       description: "{brief description}"
       sub_type: {sub-type}
       enforcement: {enforcement-level}
     ```
   - Update `summary.total_items` and `summary.extracted_items` counts

7. **Present Summary**:
   - **CREATE mode**: "Created {filename}.yaml convention in conventions/ with enforcement: {level}"
   - **UPDATE mode**: "Updated {filename}.yaml convention - Added: [list additions]"
   - List convention details (name, sub_type, enforcement)
   - Remind user: "This convention will be enforced during /buildforce.build (strict) and referenced during /buildforce.plan (all levels)"

---

## Conventions Scan Workflow

**Purpose**: Bootstrap initial conventions by analyzing the entire codebase for consistent patterns. Useful for projects adopting conventions after significant development.

**When to use**: User invokes `/buildforce.document scan conventions`

### Scan Mode Steps

1. **Analyze Codebase for Patterns**:
   - Search for consistent patterns across multiple files
   - Pattern detection criteria:
     - Appears in 5+ files
     - Implementation consistency ≥95%
     - Represents intentional convention (not accidental similarity)
   - Detectable pattern types:
     - Architectural patterns (class structures, module organization, design patterns)
     - Naming conventions (file/variable/function naming consistency)
     - Code conventions (error handling, transaction flows, API patterns)
     - Testing patterns (test structure, mocking strategies)

2. **Present Detected Patterns to User**:
   - For each detected pattern:
     ```
     ## Detected Pattern: [Pattern Name]
     - Occurrence: Found in [N] files ([percentage]% consistency)
     - Category: [sub_type value]
     - Example files: [list 3-5 files]
     - Suggested enforcement: [recommended/strict]
     - Preview: [show draft convention entry]
     ```
   - Ask user: "Would you like to add these patterns to conventions/? You can review and edit before confirming. (Y/n)"

3. **Create Convention Files from Confirmed Patterns**:
   - If user confirms (Y):
     - Follow CREATE Mode workflow above for each pattern
     - Generate kebab-case filename from pattern name
     - Set enforcement to 'recommended' by default (user can upgrade to strict later)
     - Include reference_files from pattern analysis
   - If user declines (n):
     - Skip convention creation
     - Optionally save analysis report for future reference

4. **Present Summary**:
   - "Analyzed codebase and detected [N] consistent patterns"
   - If confirmed: "Created [M] convention files in conventions/: [list filenames]"
   - If declined: "Pattern analysis complete. Run `/buildforce.document scan conventions` again to retry, or `/buildforce.document conventions` to manually add conventions."

---

## Empty Context Check (Standard Mode Only)

Before proceeding with standard documentation, verify sufficient context exists:

- Check conversation history for file reads and substantive discussion about components, architecture, or patterns
- If minimal context detected (0-2 file reads AND no substantive technical discussion):
  - Respond: "I notice there's limited context in our conversation. Would you like to run `/buildforce.research [topic]` first to gather information about what you'd like to document?"
  - Wait for user to either provide more context or run `/buildforce.research`
- If sufficient context exists, proceed with workflow below

---

## Standard Context Documentation Workflow

1. **Analyze Context Requirements**:

   Do a proactive search to determine which context files need updates or creation:

   - **Read `.buildforce/context/_index.yaml`** - this unified index contains all context entries:
     - `domains.architecture.items[]` - architecture context entries (files in `architecture/`)
     - `domains.conventions.items[]` - convention context entries (files in `conventions/`)
     - `domains.verification.items[]` - verification context entries (files in `verification/`)
   - **Search `domains.architecture.items`** to see existing architecture context files
   - **Analyze conversation history** to identify which system components/features/modules/patterns to document
     - **CRITICAL**: Conversation history is the primary source since no spec.yaml/plan.yaml exists
     - Extract key design decisions, implementation details, architectural patterns, responsibilities, dependencies
   - **Determine update vs create** for each component:
     - If existing context file covers the same component → **UPDATE** that file (do not create duplicate)
     - If existing file is >500 lines → Note for summary: consider decomposing into smaller focused files
     - If this represents new component not yet documented → **CREATE** new file
   - **Multiple components**: One `/buildforce.document` invocation may affect multiple contexts → update/create multiple files

2. **Generate Context Filenames** (for new files only):

   **CRITICAL** - Context files use semantic naming based on component identity.

   - Use component/feature/module identity, NOT spec intent
   - Format: kebab-case, max 50 characters, no numeric or timestamp prefixes
   - Examples: `authentication.yaml`, `build-command.yaml`, `error-handling.yaml`, `plan-template.yaml`
   - Validate: lowercase alphanumeric and hyphens only
   - **Check for ID conflicts**: Search `_index.yaml` `domains.architecture.items` to ensure generated ID doesn't already exist
   - If conflict exists: Choose alternative ID (append descriptor like `-module` or `-feature`, use synonym)

3. **Create/Update Context Files**:

   **For NEW context files**:

   - Load `.buildforce/context/architecture/_schema.yaml` to understand required structure and fields
   - Create new file at `.buildforce/context/architecture/{generated-filename}.yaml`
   - Set type: "structural" (required for all architecture context)
   - Populate ALL schema sections with actual context from conversation history
   - **NEVER leave placeholder text** like "[Agent will populate]" - fill in real content or omit optional fields

   **For EXISTING context files**:

   - Read current content from `.buildforce/context/architecture/{filename}.yaml`
   - Preserve all existing values (id, created date, version history)
   - Update `last_updated` to today's date
   - Intelligently merge new information:
     - Add new dependencies if discovered
     - Append to `files` sections if new files identified
     - Add new entry to `evolution` section with version bump, date, and changes
     - Update `design_decisions` if new decisions extracted from conversation
     - Append to `notes` if additional context exists
   - Do NOT duplicate existing content or contradict existing information

4. **Update Context Index**:

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
   - **Generate tags** based on component analysis (e.g., [core, workflow, agents], [auth, security, jwt])
   - **Related context field** (OPTIONAL): Add array of closely related context IDs for discovery
     - Include for: feature families, dependent modules, sibling features
     - Only add significant relationships (avoid over-populating)
     - IDs must exist in `domains.architecture.items`
     - Example: `[plan-template, iterate-plan-command, spec-command]`
   - **Update summary counts**: Increment `summary.total_items` and `summary.extracted_items`
   - Maintain proper YAML indentation (2 spaces per level)
   - Preserve existing entries (do not modify or delete)
   - For EXISTING context files, no index update needed (entry already exists)

5. **Update Related Contexts**:

   Search for dependencies or related modules mentioned in the new/updated context:

   - Automatically read and update related context files with cross-references
   - Add to `dependencies.internal` section of related files
   - Format: `module-name: "Description of relationship"`
   - Preserve existing content while adding new relationships
   - No per-file confirmation needed - all changes presented together in summary

6. **Present Completion Summary**:

   Provide a concise report after writing all files:

   - **Files created** (if any): List filenames
   - **Files updated** (if any): List filenames with brief description of what was added (e.g., "Added OAuth2 integration details")
   - **Related contexts updated** (if any): List filenames
   - **File size advisory** (if applicable): "Consider decomposing [filename] into smaller focused files (currently >500 lines)"
   - **Achievement summary**: 1-2 sentences describing what was documented
   - Example: "Created authentication.yaml context file in architecture/ documenting JWT-based authentication with OAuth2 integration. Updated error-handling.yaml to include auth error patterns."

Context: {$ARGUMENTS}
