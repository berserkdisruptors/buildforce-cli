---
version: "0.0.43"
description: Gather context and information to prepare for a spec-driven development session.
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/buildforce.research` to prepare the context window for a spec-driven development session. The text after `/buildforce.research` is their research query.

**Your task**: Answer the user's query ($ARGUMENTS) by gathering relevant information from the codebase, web sources, or your general knowledge.

**Key guidelines**:

1. **Project Context Search**: **ALWAYS start here.** Read `.buildforce/context/_index.yaml` FROM CURRENT WORKING DIRECTORY AND NEVER FROM SOMEWHERE ELSE! This unified index contains all context entries organized by domain:
   - **domains.architecture.items[]**: Structural context about WHAT exists (modules, features, components) - files in `architecture/`
   - **domains.conventions.items[]**: Convention context about HOW things are done (coding standards, patterns) - files in `conventions/`
   - **domains.verification.items[]**: Verification context about HOW to know if code is right (quality standards, known risks) - files in `verification/`

   Navigate to the appropriate domain based on your research query:
   - For architecture/structure questions → search `domains.architecture.items` for relevant entries, then read context files from `architecture/`
   - For coding standards/patterns → search `domains.conventions.items` for relevant entries, then read context files from `conventions/`
   - For quality/testing standards → search `domains.verification.items` for relevant entries, then read context files from `verification/`

   This index contains references to accumulated knowledge from all completed spec-driven development sessions. Search the appropriate domain's items array to find relevant context file paths, then read those specific context files and load them into the context window. This is your primary source of truth about the project's architecture, patterns, and decisions.

2. **Recency awareness**: If the query contains words like "current", "latest", "recent", "modern", "best practices", "2024", "2025", or "up-to-date", use web search to fetch current information—do not rely solely on training data.

3. **Structured output**: Present findings as a report with clear sections (e.g., Research Summary, Project Context, Codebase Findings, External Knowledge, TLDR, Next Steps) that can be easily referenced in subsequent `/buildforce.plan` or `/buildforce.build` steps.

4. **Relevant file paths**: For codebase queries, provide an explicit table or list of all relevant file paths discovered. This saves time—users won't need to manually reference each file with @ in follow-up commands.

5. **Architecture visualization**: For codebase queries, include a simple Mermaid diagram showing the architecture, flow, or relationships of the feature/component being researched.

6. **Data models**: When data structures are involved, explicitly document the data models with their properties, types, and relationships—not just summarized sentences.

7. **Research Persistence**: After completing all research steps above, silently persist findings. This step executes AFTER all research is complete but BEFORE presenting TLDR.

   **Session-Aware Persistence Location**:
   - Check `.buildforce/buildforce.json` for `currentSession` field
   - If `currentSession` exists (active session): Write to `.buildforce/sessions/{currentSession}/research.yaml`
   - If `currentSession` is null (no active session): Use cache strategy below

   **Cache Strategy** (when no active session):
   - Target file: `.buildforce/.temp/research-cache.yaml`
   - Check if cache file exists to determine MERGE vs REPLACE behavior

   **Topic Detection**:
   If cache exists, read the existing cache and compare its `summary` and `key_findings` with the current research query ($ARGUMENTS) and new findings. Determine if the topics are related using your semantic understanding. If related → **MERGE**, if unrelated → **REPLACE**. Do not output any comparison process, decisions, or reasoning to the user.

   **MERGE Behavior** (related research):
   - Append new findings to existing `key_findings` array (check for duplicates)
   - Append new file paths to `file_paths.primary` and `file_paths.secondary` (deduplicate)
   - Append new diagrams to `mermaid_diagrams` array (PRESERVE VERBATIM - do not modify existing diagrams)
   - Append new models to `data_models` array (deduplicate by model name)
   - Merge TLDR bullets: combine existing + new TLDR arrays, deduplicate similar points, keep most informative version
   - Update `summary` to reflect combined scope (2-4 sentences covering both research topics)
   - Update `last_updated` to today's date (YYYY-MM-DD format)
   - Add entry to `updates` array: `{date: "YYYY-MM-DD", summary: "Merged research on [new topic]"}`

   **REPLACE Behavior** (unrelated research):
   - Drop the old cache content completely
   - Overwrite the `.buildforce/.temp/research-cache.yaml` content with fresh structure:
     - `id: "research-cache"` (fixed ID for temp cache)
     - `created: "YYYY-MM-DD"` (today's date)
     - `last_updated: "YYYY-MM-DD"` (today's date)
     - Populate all sections with new research findings only

   **Silent .temp Folder Creation**:
   - If `.buildforce/.temp/` doesn't exist, create it in a single command with the file creation of the `research-cache.yaml` using mkdir -p pattern
   - DO NOT output messages like "folder doesn't exist, I will create one" - execute silently

   **Silent Execution**:
   - Execute the write operation silently (permission prompt may appear before TLDR if triggered)
   - DO NOT output any messages to the user about:
     - Merge vs replace decision
     - File write operations
     - Folder creation
     - Topic detection results
   - The write happens internally - user sees no file operation messages

   **Graceful Failure Handling**:
   If write operation fails (permission denied, disk full, etc.):
   - Catch the error silently (do not display error during this step)
   - Continue to Step 8 (TLDR) and Step 9 (Next Steps) normally
   - AFTER presenting Next Steps, display warning message:
     ```
     Research was not persisted due to permission denial.
     If you run /clear, research context will be lost.
     Re-run /buildforce.research to recreate findings after /clear.
     ```

   **Important**: Step 7 is completely silent unless write fails. Permission prompt (if needed) appears BEFORE Step 8 (TLDR), ensuring TLDR and Next Steps remain the final visible output without interruption.

8. **TLDR section**: Condense findings into 3-7 bullet points (using `-`) highlighting only the most important discoveries. Exclude code snippets, Mermaid diagrams, and extensive file path lists. Include key architectural patterns, critical decisions, or constraints, with references to detailed sections (e.g., "See Codebase Findings for file paths"). Focus on what the user needs to know to proceed.

9. **Next steps**: Suggest the logical next action (e.g., "Ready to plan? Run `/buildforce.plan` next." or "Would you like to explore anything else?").
