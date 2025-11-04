---
version: "0.0.27"
description: Gather context and information to prepare for a spec-driven development session.
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/research` to prepare the context window for a spec-driven development session. The text after `/research` is their research query.

**Your task**: Answer the user's query ($ARGUMENTS) by gathering relevant information from the codebase, web sources, or your general knowledge.

**Key guidelines**:

1. **Project Context Search**: **ALWAYS start here.** Read `.buildforce/context/_index.yaml` FROM CURRENT WORKING DIRECTORY AND NEVER FROM SOMEWHERE ELSE! Search for relevant project-specific context there before any other research. This index contains references to accumulated knowledge from all completed spec-driven development sessions, organized by modules/components/features. Search the index to find relevant context file paths, then read those specific context files and load them into the context window. This is your primary source of truth about the project's architecture, patterns, and decisions.

2. **Recency awareness**: If the query contains words like "current", "latest", "recent", "modern", "best practices", "2024", "2025", or "up-to-date", use web search to fetch current information—do not rely solely on training data.

3. **Structured output**: Present findings as a report with clear sections (e.g., Research Summary, Project Context, Codebase Findings, External Knowledge, TLDR, Next Steps) that can be easily referenced in subsequent `/buildforce.spec`, `/buildforce.plan`, or `/buildforce.build` steps.

4. **Relevant file paths**: For codebase queries, provide an explicit table or list of all relevant file paths discovered. This saves time—users won't need to manually reference each file with @ in follow-up commands.

5. **Architecture visualization**: For codebase queries, include a simple Mermaid diagram showing the architecture, flow, or relationships of the feature/component being researched.

6. **Data models**: When data structures are involved, explicitly document the data models with their properties, types, and relationships—not just summarized sentences.

7. **TLDR section**: Condense findings into 3-7 bullet points (using `-`) highlighting only the most important discoveries. Exclude code snippets, Mermaid diagrams, and extensive file path lists. Include key architectural patterns, critical decisions, or constraints, with references to detailed sections (e.g., "See Codebase Findings for file paths"). Focus on what the user needs to know to proceed.

8. **Next steps**: Suggest the logical next action (e.g., "Ready to define the spec?" or "Would you like to explore anything else?").
