---
version: "0.0.30"
description: Create or update context files for existing functionality without requiring a spec-driven development session.
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/document` to create or update context files in `.buildforce/context/` for functionality that already exists in the codebase. ($ARGUMENTS) contains the topic or module to document.

**Your task**: Document the existing functionality by analyzing conversation history, generating or updating context files following the schema structure, updating the context index, and maintaining cross-references with related contexts.

## Empty Context Check

Before proceeding, verify sufficient context exists:

- Check conversation history for file reads and substantive discussion about components, architecture, or patterns
- If minimal context detected (0-2 file reads AND no substantive technical discussion):
  - Respond: "I notice there's limited context in our conversation. Would you like to run `/buildforce.research [topic]` first to gather information about what you'd like to document?"
  - Wait for user to either provide more context or run `/buildforce.research`
- If sufficient context exists, proceed with workflow below

## Workflow Steps

1. **Analyze Context Requirements**:

   Do a proactive search to determine which context files need updates or creation:

   - **Read `.buildforce/context/_index.yaml`** to see all existing context files
   - **Analyze conversation history** to identify which system components/features/modules/patterns to document
     - **CRITICAL**: Conversation history is the primary source since no spec.yaml/plan.yaml exists
     - Extract key design decisions, implementation details, architectural patterns, responsibilities, dependencies
   - **Determine update vs create** for each component:
     - If existing context file covers the same component → **UPDATE** that file (do not create duplicate)
     - If existing file is >500 lines → Note for summary: consider decomposing into smaller focused files
     - If this represents new component not yet documented → **CREATE** new file
   - **Multiple components**: One `/document` invocation may affect multiple contexts → update/create multiple files

2. **Generate Context Filenames** (for new files only):

   **CRITICAL** - Context files use semantic naming based on component identity.

   - Use component/feature/module identity, NOT spec intent
   - Format: kebab-case, max 50 characters, no numeric or timestamp prefixes
   - Examples: `authentication.yaml`, `build-command.yaml`, `error-handling.yaml`, `plan-template.yaml`
   - Validate: lowercase alphanumeric and hyphens only
   - **Check for ID conflicts**: Search `_index.yaml` to ensure generated ID doesn't already exist
   - If conflict exists: Choose alternative ID (append descriptor like `-module` or `-feature`, use synonym)

3. **Create/Update Context Files**:

   **For NEW context files**:

   - Load `.buildforce/context/_schema.yaml` to understand required structure and fields
   - Create new file at `.buildforce/context/{generated-filename}.yaml`
   - Populate ALL schema sections with actual context from conversation history
   - **NEVER leave placeholder text** like "[Agent will populate]" - fill in real content or omit optional fields

   **For EXISTING context files**:

   - Read current content from `.buildforce/context/{filename}.yaml`
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
   - **Generate tags** based on component analysis (e.g., [core, workflow, agents], [auth, security, jwt])
   - **Related context field** (OPTIONAL): Add array of closely related context IDs for discovery
     - Include for: feature families, dependent modules, sibling features
     - Only add significant relationships (avoid over-populating)
     - IDs must exist in _index.yaml
     - Example: `[slash-commands, plan-template, spec-command]`
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
   - Example: "Created authentication-module.yaml context file documenting JWT-based authentication with OAuth2 integration. Updated error-handling.yaml to include auth error patterns."

Context: {$ARGUMENTS}
