---
description: Gather context and information to prepare for a spec-driven development session.
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/research` to prepare the context window for a spec-driven development session. The text after `/research` is their research query.

**Your task**: Answer the user's query ($ARGUMENTS) by gathering relevant information from the codebase, web sources, or your general knowledge.

**Key guidelines**:

1. **Project Context Search**: **ALWAYS start here.** Read `.buildforce/context/_index.yaml` FROM CURRENT WORKING DIRECTORY AND NEVER FROM SOMEWHERE ELSE! Search for relevant project-specific context there before any other research. This index contains references to accumulated knowledge from all completed spec-driven development sessions, organized by modules/components/features. Search the index to find relevant context file paths, then read those specific context files and load them into the context window. This is your primary source of truth about the project's architecture, patterns, and decisions.

2. **Recency awareness**: If the query contains words like "current", "latest", "recent", "modern", "best practices", "2024", "2025", or "up-to-date", use web search to fetch current information—do not rely solely on training data.

3. **Structured output**: Present findings as a report with clear sections (e.g., Research Summary, Project Context, Codebase Findings, External Knowledge, TLDR, Next Steps) that can be easily referenced in subsequent `/spec` or `/build` steps.

4. **Relevant file paths**: For codebase queries, provide an explicit table or list of all relevant file paths discovered. This saves time—users won't need to manually reference each file with @ in follow-up commands.

5. **Architecture visualization**: For codebase queries, include a simple Mermaid diagram showing the architecture, flow, or relationships of the feature/component being researched.

6. **Data models**: When data structures are involved, explicitly document the data models with their properties, types, and relationships—not just summarized sentences.

7. **Next steps**: After presenting findings, suggest the logical next action (e.g., "Ready to define the spec?" or "Would you like to explore anything else?").

8. **TLDR section**: **ALWAYS add a "## TLDR" section before "Next Steps".** Condense findings into 3-7 bullet points (using `-`) highlighting only the most important discoveries. Exclude code snippets, Mermaid diagrams, and extensive file path lists. Include key architectural patterns, critical decisions, or constraints, with references to detailed sections (e.g., "See Codebase Findings for file paths"). Focus on what the user needs to know to proceed.

## Research Persistence

After presenting your research findings to the user, persist the COMPLETE research output to enable intelligent materialization during `/spec` execution:

1. **Check if cache should accumulate**:

   - Read `.buildforce/.current-spec` from current working directory
   - If file exists and has content: **SKIP cache append** (research will be merged with existing research.yaml during spec update)
   - If file doesn't exist or is empty: **PROCEED with cache append** (pre-spec research phase)

2. **Append to research cache** (only if no active spec exists):

   - Use Write tool to append to `.buildforce/.research-cache.md` (create if doesn't exist)
   - **CRITICAL**: Append the COMPLETE research output you presented to the user
   - Include ALL sections: Research Summary, Project Context, Codebase Findings, External Knowledge, TLDR
   - **PRESERVE ALL CONTENT TYPES**: Mermaid diagrams, data models, code snippets, file paths, external references
   - **DO NOT truncate, summarize, or condense** - this is raw research that will be intelligently materialized by /spec

3. **Cache format** (use this exact structure):

   ```
   ================================================================================
   Research Session: <current-timestamp-YYYY-MM-DD HH:MM:SS>
   Type: research_command
   ================================================================================

   <COMPLETE-RESEARCH-OUTPUT-HERE>

   ================================================================================

   ```

4. **Example append operation**:

   - If `.buildforce/.research-cache.md` doesn't exist, create it with the session
   - If it exists, append new session below existing content
   - Each session is separated by the `===` separators for easy parsing

5. **DO NOT inform the user about cache operations** - this is an internal persistence mechanism. The user sees only your research findings and next steps suggestion.
