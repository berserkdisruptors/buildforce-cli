---
description: Create or update context files for existing functionality without requiring a spec-driven development session.
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/document` to create or update context files in `.buildforce/context/` for functionality that already exists in the codebase. ($ARGUMENTS) contains the topic or module to document. Information about this topic/module is assumed to be already loaded in the context window (via file reads, previous conversation, etc.).

**Your task**: Document the existing functionality by generating or updating a context file following the schema structure, updating the context index, and maintaining cross-references with related contexts.

**Key guidelines**:

1. **Determine Mode**: Check if a context file with similar name or ID already exists in `.buildforce/context/_index.yml` and the context directory. If found, set UPDATE mode and read the existing file. Otherwise, set CREATE mode.

2. **Load Schema & Analyze**: **ALWAYS** start by reading `.buildforce/context/_schema.yml` to understand required structure. Analyze the topic/module information already in the context window to extract: name, type (module/feature/component/pattern - auto-detect), responsibilities, dependencies, files, and other relevant details.

3. **Generate Name & Check Conflicts**: Create a 2-3 word snake-case filename from the topic (e.g., "authentication-module.yml", "error-handling.yml"). **NEVER** use numeric prefixes. Search `.buildforce/context/_index.yml` for ID conflicts. If conflict exists, choose an alternative ID (append descriptor, use synonym, or ask user for preferred name).

4. **Generate/Update Context File**: Populate ALL required schema fields (id, name, type, status, created, last_updated, summary) and optional fields where information is available (responsibilities, dependencies, files, evolution, notes). **NEVER** leave placeholder text like "[Agent will populate]"—omit fields if no real information is available. For UPDATE mode: intelligently merge new information into existing content (preserve existing, append to lists, update changed fields). Mutate current state to new state regardless of who previously edited the file.

5. **Update Index**: Add new entry to `.buildforce/context/_index.yml` with auto-generated tags (extract from topic analysis - use 3-5 specific tags like technical terms, domain concepts, type). If UPDATE mode, verify existing index entry is correct.

6. **Update Related Contexts**: Search for dependencies or related modules mentioned in the new context. Automatically read and update related context files with cross-references (add to dependencies section). Preserve existing content while adding new relationships. No per-file confirmation needed.

7. **Present & Confirm**: Show the generated/updated context file content, `_index.yml` updates, and any related context file changes. Clearly summarize what will be created or modified. **ALWAYS** request user confirmation before writing any files.

Context: {$ARGUMENTS}
