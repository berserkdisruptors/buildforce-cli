---
version: "0.0.36"
description: Create or update a structured specification (spec.yaml) and implementation plan (plan.yaml) that capture WHAT needs to be built and HOW to build it.
scripts:
  sh: bash src/scripts/bash/create-spec-files.sh --folder-name "{FOLDER_NAME}" --json
  ps: src/scripts/powershell/create-spec-files.ps1 -FolderName "{FOLDER_NAME}" -Json
---

The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

$ARGUMENTS

The text the user typed after `/buildforce.plan` in the triggering message **is** the feature description. Assume you always have it available in this conversation even if `{ARGS}` appears literally below. Do not ask the user to repeat it unless they provided an empty command.

## Workflow Steps

1. **Determine CREATE vs UPDATE mode**:

   - Read `.buildforce/buildforce.json` file from current working directory and parse the `currentSession` field
   - If file exists and `currentSession` field has a value (non-empty folder name): **UPDATE mode** - Load existing spec and plan from that folder
   - If file doesn't exist or `currentSession` is null/empty: **CREATE mode** - Generate new folder name and create new spec and plan

2. **For CREATE mode (new spec)**:

   **Step 2a: Generate folder name**:

   - **Extract semantic slug**: Analyze the user's feature description and extract 3-5 key words that capture the intent
   - **Format semantic slug**: Convert to kebab-case, max 35 characters, lowercase alphanumeric and hyphens only, must start with a letter
     - Examples: "add-auth-jwt", "refactor-error-handling", "implement-caching"
   - **Get UTC timestamp**: Generate current UTC timestamp in format YYYYMMDDHHmmss (14 digits)
     - Use the current conversation timestamp for consistency
   - **Combine**: Append timestamp to slug with hyphen separator
     - Format: `{semantic-slug}-{timestamp}`
     - Example: `add-auth-jwt-20250122143052`
   - **Validate**: Ensure total length ≤50 characters (35 for slug + 1 hyphen + 14 for timestamp)
   - **Set {FOLDER_NAME}**: Replace {FOLDER_NAME} in the script command with your generated folder name

   **Step 2b: Run script to create folder and files**:

   - Run `{SCRIPT}` from current working directory with generated FOLDER_NAME and parse JSON output for FOLDER_NAME, SPEC_FILE, PLAN_FILE, SPEC_DIR
   - The script creates both spec.yaml and plan.yaml files from templates

   **Step 2c: Materialize research.yaml from conversation history** (if research context exists):

   Determine if research context exists in the conversation and materialize it into structured research.yaml:

   1. **Assess conversation for research context**:

      - Review conversation history for research-related content:
        - Explicit `/buildforce.research` command output with findings, diagrams, data models
        - User discussions about architecture, patterns, or technical exploration
        - File path discoveries, codebase analysis, or external references
      - If NO research context exists (user went straight to `/buildforce.plan`): **SKIP to Step 2d** - don't create empty research.yaml
      - If research context EXISTS: **PROCEED with materialization**

   2. **Read template structure**:

      - Read `.buildforce/templates/research-template.yaml` for structure guidance
      - Understand flexible sections: summary, key_findings, file_paths, mermaid_diagrams, data_models, code_snippets, architectural_decisions, external_references, tldr
      - Remember: sections are OPTIONAL - adapt to research content type

   3. **Intelligent materialization from conversation** (CRITICAL - preserve information richness):

      - **PRESERVE VERBATIM**: Mermaid diagrams, data models, code snippets - these are essential for /buildforce.build
      - **PRESERVE WITH CONTEXT**: File paths (with relevance notes), architectural decisions (with rationale)
      - **CONDENSE INTELLIGENTLY**: Research summary prose (2-4 sentences), project context (key points only)
      - **MERGE**: TLDR bullets from research discussions into unified tldr section
      - **DO NOT TRUNCATE**: Diagrams, models, code snippets must be complete
      - **DO NOT OVER-CONDENSE**: Preserve information-rich elements - /buildforce.build needs comprehensive context

   4. **Create research.yaml**:
      - Write to `.buildforce/sessions/{FOLDER_NAME}/research.yaml`
      - Set id = "{FOLDER_NAME}-research"
      - Follow template structure but omit sections with no content (e.g., no diagrams if research was conceptual)
      - Ensure materialized research is condensed but information-rich

   **Step 2d: Load project guidelines** (if available):

   Guidelines provide project-specific conventions that must be followed during implementation.

   - Check if `.buildforce/context/_guidelines.yaml` exists
   - If exists, read and parse guidelines:
     - Treat as HIGHEST PRIORITY context for plan generation
     - Reference specific guidelines when making technical decisions
     - Consider enforcement levels: strict (MUST follow), recommended (SHOULD follow), reference (context only)
   - If missing, continue without guidelines (backward compatible)

   **Step 2e: Populate both spec.yaml and plan.yaml**:

   **For spec.yaml (WHAT to build)**:

   - Load `.buildforce/templates/spec-template.yaml` from the current working directory to understand structure and fields
   - **Read research.yaml if it exists** (from Step 2c materialization):
     - Path: `.buildforce/sessions/{FOLDER_NAME}/research.yaml`
     - If exists, use research findings to inform spec.yaml population:
       - Extract key requirements from research key_findings
       - Reference architectural_decisions when defining scope and design principles
       - Use file_paths to identify affected components and dependencies
       - Merge research ambiguities into open_questions
       - Reference external_references in notes or dependencies sections
     - Ensure spec.yaml is context-aware based on materialized research
   - Populate with requirements, scope, goals, acceptance criteria (WHAT content)
   - For metadata: Set id = "{FOLDER_NAME}" (the full slug-timestamp you generated), status = "draft", dates = today YYYY-MM-DD
   - Ensure requirements use unique IDs (FR1, FR2, ..., NFR1, ..., AC1, ...)
   - **CRITICAL**: Actively populate `open_questions` with any requirement ambiguities or missing details
   - Focus on WHAT needs to be built, not HOW to build it

   **For plan.yaml (HOW to build)**:

   - Load `src/templates/plan-template.yaml` to understand structure
   - Populate with architecture, technical decisions, implementation phases, tasks (HOW content)
   - **If _guidelines.yaml was loaded**: Reference specific guidelines in your plan:
     - In `decisions` section: Cite relevant architectural patterns or code conventions
     - In `technology_stack`: Align with dependency_rules if present
     - In phase task `notes`: Call out strict enforcement guidelines that must be followed
     - Example: "Phase 1 tasks must follow Repository Pattern guideline (strict enforcement)"
   - Set spec_id = "{FOLDER_NAME}", link tasks to spec requirements via spec_refs
   - Include technology choices, design patterns, file structure, testing strategy
   - Focus on HOW to implement the requirements from spec.yaml

   **Verify template structure**: After populating both files, confirm they follow template structure—check all top-level sections exist (spec: INTENT, GOALS, REQUIREMENTS, SCOPE, DESIGN PRINCIPLES, ACCEPTANCE CRITERIA, ASSUMPTIONS & DEPENDENCIES, OPEN QUESTIONS, NOTES; plan: ARCHITECTURE OVERVIEW, FILE STRUCTURE, IMPLEMENTATION PHASES, DEVIATION LOG, TESTING GUIDANCE, VALIDATION CRITERIA, PROGRESS SUMMARY, RISKS & CONSIDERATIONS, NOTES), required metadata fields are present (id, name, type, status, created, last_updated), and field types match templates.

3. **For UPDATE mode (existing spec)**:

   **Step 3a: Load existing artifacts and research context**:

   - Read folder name from `.buildforce/buildforce.json` (`currentSession` field)
   - Load both existing spec.yaml and plan.yaml from `.buildforce/sessions/{folder-name}/`
   - **Read research.yaml if it exists**:
     - Path: `.buildforce/sessions/{folder-name}/research.yaml`
     - If exists, load research findings to maintain context consistency
     - Use research context when analyzing update requirements
     - This ensures updates align with prior research findings

   **Step 3b: Update research.yaml from conversation** (if new research context exists):

   After loading existing artifacts, check if new research was conducted and update research.yaml:

   1. **Assess conversation for new research context**:

      - Review recent conversation history for new research-related content:
        - New `/buildforce.research` command output since spec creation
        - Additional user discussions about architecture or technical exploration
        - New file path discoveries, codebase analysis, or external references
      - If NO new research context: **SKIP to Step 3c** - keep existing research.yaml as-is
      - If new research context EXISTS: **PROCEED with update**

   2. **Read template structure**:

      - Read `.buildforce/templates/research-template.yaml` for structure guidance

   3. **Intelligent merge with existing research.yaml**:
      - Read existing `.buildforce/sessions/{folder-name}/research.yaml`
      - Compare new conversation content with existing research
      - **Append new findings** with update metadata:
        ```yaml
        updates:
          - date: "YYYY-MM-DD"
            summary: "Brief description of what new research added"
        ```
      - **Preserve new artifacts**: Append new diagrams, models, snippets to respective sections
      - **Merge TLDR**: Combine new TLDR bullets with existing without duplication
      - **DO NOT duplicate**: Check for similar findings before appending
      - Update `last_updated` field
      - Write updated research.yaml back to spec folder

   **Step 3c: Load project guidelines** (if available):

   Guidelines provide project-specific conventions that must be followed during implementation.

   - Check if `.buildforce/context/_guidelines.yaml` exists
   - If exists, read and parse guidelines:
     - Treat as HIGHEST PRIORITY context when updating plans
     - Reference specific guidelines when making technical decisions
     - Consider enforcement levels when updating plan.yaml
   - If missing, continue without guidelines (backward compatible)

   **Step 3d: Intelligent routing** - Determine which file(s) to update based on user input:

   - Analyze $ARGUMENTS to determine content type:
     - **Requirements/scope/goals** → Update spec.yaml only
     - **Architecture/tech decisions/phases** → Update plan.yaml only
     - **Mixed content** → Update both files appropriately
   - Preserve all existing field values (id, created date, etc.)
   - Update `last_updated` to today's date in modified file(s)
   - For spec.yaml updates:
     - Add new requirements with sequential IDs (maintain FR1, FR2, ... sequence)
     - Update `open_questions` if new ambiguities identified
     - Do NOT duplicate or contradict existing requirements
   - For plan.yaml updates:
     - Add/modify technical decisions, phases, or tasks
     - Update spec_refs to link new tasks to requirements
     - Do NOT contradict existing architectural decisions without explicit reasoning
   - Report what changed with specific examples (e.g., "Added FR5-FR7 for error handling to spec.yaml", "Updated plan.yaml Phase 2 with new database migration tasks")

4. **Identify Ambiguities & Clarifying Questions** (CRITICAL STEP):

   This is a key quality gate - do NOT skip this step.

   **Before writing the spec and plan:**

   - Analyze the feature description for vague, ambiguous, or incomplete information
   - Identify assumptions that need validation (both requirements AND technical)
   - Note any missing details, edge cases, or constraints
   - If the intent is too vague, ask clarifying questions BEFORE creating the spec

   **When creating the spec and plan:**

   - Use spec.yaml `open_questions` for requirement ambiguities
   - Questions can cover both WHAT (requirements) and HOW (technical decisions)
   - Do NOT make assumptions to fill gaps - explicitly list unknowns
   - Examples:
     - Requirements: "Should user sessions persist across browser restarts?"
     - Technical: "Which database migration tool should we use?"
     - Architecture: "Should we use REST or GraphQL for the API?"

   **After writing the spec and plan:**

   **Question Format Requirements (CRITICAL)**:

   When presenting clarifying questions to users, you MUST follow this standardized format:

   **Format Structure:**

   - Number questions sequentially: 1, 2, 3, 4, ...
   - Provide 2-3 predefined options per question, labeled alphabetically: A, B, C
   - ALWAYS include a final option: "X. Other (please specify)"
   - Use this format when predefined options make sense; fall back to plain text questions when they don't

   **Format Template:**

   ```
   **1. [Question text]?**
      A. [First option]
      B. [Second option]
      C. [Third option] (optional)
      X. Other (please specify)

   **2. [Question text]?**
      A. [First option]
      B. [Second option]
      X. Other (please specify)
   ```

   **Example Questions:**

   **1. What should be the JWT token expiration time?**
   A. 15 minutes
   B. 30 minutes
   C. 1 hour
   X. Other (please specify)

   **2. Which authentication library should we use?**
   A. passport.js
   B. jsonwebtoken
   C. auth0
   X. Other (please specify)

   **When to Use This Format:**

   - Use structured format when predefined options provide meaningful choices
   - Fall back to plain text questions when predefined options would be artificial or limiting
   - Prioritize user experience - don't force the format if it doesn't fit the question

   **After formatting questions:**

   - Review both files for completeness
   - If `open_questions` has items, present them to the user NOW using the format above
   - Format: "I've created the spec and plan, but need clarification on these points:"
   - Wait for user responses and update files accordingly
   - **NEVER present plan summary if open questions exist**

5. **Behavior rules**:

   - spec.yaml focuses on WHAT (requirements, scope, goals, acceptance criteria)
   - plan.yaml focuses on HOW (architecture, tech stack, implementation approach)
   - Ensure all requirements are testable and measurable
   - Keep scope incremental (single, focused change)
   - Check for contradictions between spec requirements and plan implementation

6. **Report completion**:

   **If spec has open questions:**

   - Report folder name, spec file path, and plan file path
   - Present the open questions list to the user with clear formatting
   - Ask user to provide answers/clarifications
   - Explain: "I'll wait for your input before presenting the implementation plan."
   - Do NOT present plan summary yet - questions must be resolved first

   **If NO open questions (or after questions are resolved):**

   **For CREATE mode**, present a **spec summary** followed by the **condensed plan summary**.

   **For UPDATE mode**, present a **spec summary (changes only)** followed by the **condensed plan summary**.

   **Spec Summary Format:**

   ## Spec Summary

   [Synthesize the full spec.yaml context into a flowing narrative that combines: (1) the problem being solved and why it matters, (2) the primary goals, (3) key functional and non-functional requirements, (4) what's in scope and what's explicitly out of scope, and (5) how success will be measured through acceptance criteria. Adapt verbosity to feature complexity: one sentence for simple features, 2-3 sentences (short paragraph) for complex features. Focus on WHAT is being built, not HOW.]

   **For UPDATE mode only**: Replace the above with a delta view showing only what changed:

   ## Spec Summary

   [Describe only what changed in this update: new requirements added, scope modifications, updated acceptance criteria, or clarified goals. Keep concise and focused on the delta, not the full current state. Example: "Added FR5-FR7 for error handling with retry logic, expanded scope to include logging infrastructure, and updated AC3 to require 99.9% uptime."]

   ***

   Then present a **condensed plan summary** using this format:

   ```
   ## Implementation Plan Summary

   1. **[Phase 1 Name]**
      - [Key task 1]
      - [Key task 2]
      - [Key task 3]

   2. **[Phase 2 Name]**
      - [Key task 1]
      - [Key task 2]
      - [Key task 3]

   3. **[Phase 3 Name]**
      - [Key task 1]
      - [Key task 2]
      - [Key task 3]

   **Key Architecture Decisions:**
   - [Decision 1]: [Brief rationale]
   - [Decision 2]: [Brief rationale]

   **Testing Strategy:** [One sentence summary]

   **Risks:** [One sentence summary of main risks]
   ```

   Then suggest: **"Ready to code? Run `/buildforce.build` to start implementation."**

   **For UPDATE mode**: Summarize changes made to spec.yaml and/or plan.yaml, present updated condensed plan summary if plan changed, and suggest: "Ready to code? Run `/buildforce.build` to start implementation."

   **IMPORTANT**: Every subsequent `/buildforce.plan` invocation updates BOTH files based on intelligent routing of the user's input content. Raw user input with explicit `/buildforce.plan` invocation might also intent to update BOTH so decide accordingly.
