<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.png">
  <source media="(prefers-color-scheme: light)" srcset=".github/assets/logo-light.png">
  <img src=".github/assets/logo.png" alt="BuildForce CLI Logo" width="250"/>
</picture>

**Context-first Spec-Driven Development framework**

[![npm version](https://img.shields.io/npm/v/@buildforce/cli)](https://www.npmjs.com/package/@buildforce/cli)
[![npm downloads](https://img.shields.io/npm/dm/@buildforce/cli)](https://www.npmjs.com/package/@buildforce/cli)
[![GitHub stars](https://img.shields.io/github/stars/berserkdisruptors/buildforce-cli)](https://github.com/berserkdisruptors/buildforce-cli/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

Buildforce is a **context-first framework for Spec-Driven Development** that works through CLI initialization and slash commands for AI coding agents.

It materializes user intent into structured specifications, generates implementation plans, and tracks execution with full traceability. By creating a persistent **context repository** that accumulates important context across sessions, it enables AI agents to learn from past decisions and maintain consistency across features.

Instead of re-explaining architectural decisions every time you start a new feature, Buildforce preserves them within your repository where they're searchable and reusable.

## Why context-first?

AI agents start fresh with each session and reverse engineer the codebase on-demand. Buildforce inverts this by loading accumulated context first by searching your context repository before you define requirements. This context-warming approach ensures specs are informed by past decisions, plans reference existing patterns, and implementations remain consistent. Context persists in version-controlled YAML files alongside your code, so your project's knowledge base grows smarter with every feature you complete. Context-first means less time explaining, more time building.

## What Makes It Different

| AI Assistant only                             | AI Assistant + Buildforce                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| Context lost after each session               | Context persists in `.buildforce/context/`                                            |
| No workflow structure                         | Flexible but structured workflows                                                     |
| Requirements exist only in conversation       | User intent captured in `spec.yaml` with acceptance criteria                          |
| Plans exist only in specific modes            | The captured spec is automatically converted into a plan that the user can iterate on |
| Implementation deviations go untracked        | Deviations logged with rationale (Original → Actual → Reason)                         |
| Architectural decisions forgotten             | Decisions preserved and searchable                                                    |
| Knowledge lives in individual developer heads | Shared context repository for team-wide knowledge                                     |
| Each feature starts from scratch              | Each feature builds on accumulated project context                                    |

## Quick Start

### Installation

```bash
# Initialize a Project
> npm install -g @buildforce/cli
> buildforce .

# Or initialize with npx
> npx @buildforce/cli .
```

<div align="center">
<img src=".github/assets/screenshot-init.png" alt="Buildforce initialization screenshot" width="700"/>
</div>

### Your First Workflow (Hello Buildforce)

Open your AI assistant (Claude Code, Cursor, etc.) in any existing project and run:

```
/research the architecture and structure of this codebase

/spec Update README.md to fix any inconsistencies with actual project structure and features

/build

/complete
```

This workflow works on any codebase! Buildforce will analyze your project, identify README inconsistencies, and fix them systematically. Context from `/research` informs your spec. Spec requirements guide the plan. Build executes with deviation tracking. Completion validates everything and saves knowledge to your context repository for future work.

## How It Works

Buildforce uses slash commands inside AI assistant conversations to orchestrate a structured workflow. Unlike typical CLI tools executed in your terminal, Buildforce commands run _within_ your AI chat to guide development phases.

**Workflow visualization:**

```
                     ┌─────────────────────┐
                     │ Context Repository  │
                     └─────────────────────┘
                              ↓           ↑
                        reads │           │ writes
                              │           │
    /research ────────────────┘           │
         ↓                                │
    /spec (creates spec and plan files)   |
         ↓                                │
    /build (follows the plan and builds)  │
         ↓                                │
    /complete ────────────────────────────┘
```

**What happens at each command:**

- `/research`: Searches `.buildforce/context/` for accumulated knowledge, explores codebase patterns and search web if needed
- `/spec`: Materializes user intent into structured requirements (functional, non-functional, acceptance criteria) saved as `spec.yaml` and actionable plan saved as `plan.yaml`
- `/build`: Executes plan phases sequentially, updates progress, logs deviations from the plan on multiple iterations
- `/complete`: Validates all requirements met, generates context files from spec+plan+implementation, updates context repository
- `/document`: Standalone utility for documenting existing code without full spec-driven cycle

**Three workflow scenarios:**

1. **Basic workflow** (recommended for simple updates):

   ```
   /spec → /build
   ```

2. **Full workflow** (recommended for new features and bug fixes):

   ```
   /research → /spec → /build → /complete
   ```

3. **Documentation workflow** (manual context contribution):
   ```
   /research [topic] → /document [module]
   ```

The key insight: Buildforce isn't just about individual commands. It's about how commands feed context forward (research informs spec, spec guides plan, plan drives build, build enriches context). This orchestration prevents context loss and creates knowledge that compounds over time.

## Commands

### /research - Gather Context

**Purpose**: Search accumulated project context, explore codebase patterns, and fetch current information to inform spec creation.

**Usage:**

```
/research <your-query>
```

**Examples:**

```
/research authentication patterns in this codebase

/research current best practices for error handling in Express.js 2025

/research how pagination is implemented in our API
```

**What it does:**

1. Reads `.buildforce/context/_index.yaml` and searches accumulated project knowledge first
2. Explores codebase using glob/grep when codebase patterns are relevant
3. Fetches current information via web search if query contains recency indicators ("current", "latest", "2025", "best practices")
4. Produces structured report with file paths, architecture diagrams (Mermaid), data models, and recommendations
5. Research findings remain in conversation history for materialization into `research.yaml` during `/spec` (when needed)

**Output sections:**

- Research Summary
- Project Context (from `.buildforce/context/`)
- Codebase Findings (file paths, code patterns)
- External Knowledge (documentation links, best practices)
- TLDR (3-7 bullet points of key findings)
- Next Steps

**Key features:**

- Context-first: Always searches your accumulated knowledge before external sources
- Recency detection: Automatically triggers web search when query implies current information needed
- Structured output: Explicitly documents file paths, architecture, and data models for easy reference
- Research persistence: Caches output for intelligent materialization into spec's `research.yaml`

**Pro tip**: Run `/research` before `/spec` to ensure specifications are informed by existing patterns and current best practices. Research output stays in context window to guide requirement identification.

---

### /spec - Define Requirements

**Purpose**: Materialize user intent into structured specification defining WHAT needs to be built.

**Usage:**

```
/spec <feature-description>
```

**Examples:**

```
/spec Add JWT-based authentication with email/password login and token refresh

/spec Fix pagination bug where last page returns empty results

/spec Refactor user service to use repository pattern with dependency injection
```

**What it does:**

1. Determines CREATE vs UPDATE mode by checking `.buildforce/.current-spec` file
2. Generates semantic folder name with timestamp (e.g., `add-jwt-auth-20250130143052`)
3. Runs `.buildforce/scripts/bash/create-spec-files.sh` to create folder and template files
4. Populates `spec.yaml` with problem statement, functional requirements (FR1, FR2...), non-functional requirements (NFR1, NFR2...), acceptance criteria (AC1, AC2...), scope (in/out), design principles, open questions
5. Can materialize `research.yaml` from conversation history (if research was conducted)
6. Asks clarifying questions if intent is vague or context insufficient

**Output file structure:**

```yaml
id: add-jwt-auth-20250130143052
name: "JWT Authentication"
type: feature
status: draft
summary: |
  Brief description of what this spec addresses

problem: |
  What problem this solves and why it matters

functional_requirements:
  - FR1: Issue JWT token on successful login
  - FR2: Validate JWT on protected endpoints

acceptance_criteria:
  - AC1: Login returns 200 with JWT within 300ms p95
  - AC2: Invalid credentials return 401 within 100ms

in_scope:
  - User login with email/password
  - JWT token issuance and validation

out_of_scope:
  - OAuth integration
  - Two-factor authentication

open_questions:
  - Should tokens be stored in httpOnly cookies or localStorage?
```

**Key features:**

- Semantic folder naming: Feature identity preserved in folder name (not just timestamp)
- CREATE/UPDATE modes: Intelligently detects if updating existing spec or creating new
- Research materialization: Automatically converts research cache into structured `research.yaml`
- Requirement traceability: Every requirement gets unique ID (FR1, NFR1, AC1) for tracking through plan and build
- Clarifying questions: Asks user to resolve ambiguities before proceeding

**Pro tip**: Run `/spec` multiple times to refine requirements. UPDATE mode loads existing spec and allows iteration without losing previous work.

---

### /build - Execute Implementation

**Purpose**: Execute implementation following spec and plan, with progress tracking and deviation logging.

**Usage:**

```
/build [optional-iteration-instructions]
```

**Examples:**

```
/build

/build Change axios to fetch for HTTP requests

/build Add validation for empty email field
```

**What it does:**

1. Loads `spec.yaml` and `plan.yaml` from current feature directory
2. Loads `research.yaml` if it exists for implementation context (file paths, patterns, data models, code snippets)
3. Executes tasks sequentially from plan phases
4. Updates task checkboxes in `plan.yaml` as work completes: `- [ ]` becomes `- [x]`
5. Logs deviations when implementation differs from plan (phase, task, original, actual, reason)
6. Validates implementation against BOTH spec requirements AND plan steps
7. Runs tests and provides testing guidance (what to test, how to test, results)
8. Supports iterative refinement: run `/build` multiple times with different instructions

**Deviation tracking example:**

```yaml
deviations:
  - phase: "phase_1"
    task: "Create JWT service"
    original: "Use jsonwebtoken library"
    actual: "Used jose library instead"
    reason: "jsonwebtoken lacks native ESM support; jose is ESM-first with better TypeScript types"

  - phase: "phase_2"
    task: "Add login endpoint"
    original: "Return JWT in response body"
    actual: "Set JWT in httpOnly cookie"
    reason: "Cookie approach provides better XSS protection per security review"
```

**Progress tracking in plan.yaml:**

```yaml
phase_1:
  name: "Core Authentication"
  tasks:
    - [x] Create JWT service
    - [x] Add login endpoint
    - [ ] Create authentication middleware
```

**Key features:**

- Progress tracking: Live checkbox updates in `plan.yaml` show completion status
- Deviation logging: Transparency about what changed and why (Original → Actual → Reason)
- Dual validation: Checks against spec requirements AND plan steps
- Iterative refinement: Multiple `/build` invocations accumulate deviations (not replaced)
- Testing guidance: Suggests what/how to test, runs automated tests, reports results
- Code quality checks: Verifies compilation, runs tests, checks for obvious issues before presenting work

**Pro tip**: Don't try to do everything in one `/build`. Run it, review output, then run `/build [refinement instructions]` to iterate. Deviation log tracks entire journey from first attempt to final implementation.

---

### /complete - Finalize and Validate

**Purpose**: Finalize feature by validating requirements, generating context files, and clearing spec state.

**Usage:**

```
/complete [optional-final-notes]
```

**What it does:**

1. Loads `spec.yaml` and `plan.yaml` from current feature directory
2. Validates all spec requirements implemented (FR1, FR2, NFR1, AC1, AC2 all met?)
3. Reviews deviation log across all `/build` iterations
4. Generates completion report: requirement validation, implementation summary, deviations, files modified, testing status
5. Creates context file(s) in `.buildforce/context/` with semantic kebab-case naming (e.g., `jwt-authentication.yaml`)
6. Updates `.buildforce/context/_index.yaml` with references, tags, and relationships
7. Intelligently updates related context files with cross-references
8. Clears `.buildforce/.current-spec` to reset spec state
9. Optionally archives or deletes research cache
10. Requires explicit user confirmation before finalizing

**Generated context file structure:**

```yaml
id: jwt-authentication
name: "JWT Authentication System"
type: feature
created_at: "2025-01-30T14:30:52Z"
last_updated: "2025-01-30T16:45:12Z"

summary: |
  JWT-based authentication system using jose library with httpOnly cookie storage.

spec_reference: ".buildforce/specs/add-jwt-auth-20250130143052/spec.yaml"
plan_reference: ".buildforce/specs/add-jwt-auth-20250130143052/plan.yaml"

key_decisions:
  - Used jose library instead of jsonwebtoken for ESM support
  - Tokens stored in httpOnly cookies (not localStorage) for XSS protection
  - 1h access token expiry with refresh token rotation

primary_files:
  - src/auth/jwt.service.ts
  - src/auth/auth.controller.ts
  - src/middleware/auth.middleware.ts

related_contexts:
  - authentication-patterns
  - api-security
  - user-service

tags:
  - authentication
  - security
  - JWT
```

**Key features:**

- Requirement validation: Explicit check that all FR, NFR, AC from spec are satisfied
- Context file generation: Converts spec+plan+implementation into reusable knowledge
- Automatic cross-referencing: Updates related context files to link to new context
- Index maintenance: Keeps `.buildforce/context/_index.yaml` current with all contexts
- State clearing: Resets spec state so next `/spec` starts fresh
- Confirmation required: User must approve before finalization (prevents accidental completion)

**Pro tip**: Don't rush to `/complete`. Validate thoroughly first. Once complete, the feature knowledge enters your context repository and will inform future `/research` queries.

---

### /document - Create Context Files

**Purpose**: Document existing functionality without full spec-driven workflow.

**Usage:**

```
/document <topic-or-module>
```

**Examples:**

```
/document authentication module

/document error handling patterns

/document database connection pooling strategy
```

**What it does:**

1. Checks conversation history for sufficient context (file reads, technical discussion)
2. Reads `.buildforce/context/_index.yaml` to identify existing contexts
3. Determines UPDATE vs CREATE: updates existing file if component already documented, creates new file otherwise
4. Auto-detects context type (module, feature, component, pattern, architecture)
5. Generates semantic kebab-case filename without numeric prefixes (e.g., `authentication.yaml`, `error-handling.yaml`)
6. Checks for ID conflicts in `_index.yaml` and resolves duplicates
7. Populates context file from conversation history: design decisions, implementation details, patterns, responsibilities, dependencies
8. Updates `.buildforce/context/_index.yaml` with tags for discoverability
9. Automatically updates related context files with cross-references

**Generated context file example:**

```yaml
id: error-handling
name: "Error Handling Patterns"
type: pattern
created_at: "2025-01-30T10:15:00Z"

summary: |
  Centralized error handling using Express error middleware with typed error classes.

pattern_details: |
  All errors extend AppError base class with statusCode and isOperational properties.
  Error middleware at app.ts catches all errors and returns consistent JSON response.
  Unhandled promise rejections caught by global handler.

primary_files:
  - src/errors/AppError.ts
  - src/errors/errorHandler.middleware.ts
  - src/app.ts

related_contexts:
  - api-architecture
  - logging-strategy

tags:
  - error-handling
  - middleware
  - patterns
```

**Key features:**

- Standalone utility: Works independently without spec/build cycle
- Empty context check: Prompts for `/research` if insufficient context in conversation
- Smart update vs create: Prevents duplicate contexts for same component
- Multiple components: Single `/document` can update/create multiple context files
- Semantic naming: Uses component identity, not spec intent (no timestamps or numbers)
- ID conflict resolution: Ensures unique IDs in context repository
- Cross-referencing: Maintains relationships between related contexts

**Pro tip**: Prepare context window first (read files, discuss architecture) before running `/document`. The command analyzes conversation history to extract documentation, so richer context produces better results. Natural complement to `/research`: research reads context, document writes context.

---

## Supported AI Assistants

Buildforce works with 11 AI coding assistants:

| AI Assistant   | Configuration Folder  | Installation Command |
| -------------- | --------------------- | -------------------- |
| Claude Code    | `.claude/commands/`   | `--ai claude`        |
| GitHub Copilot | `.github/commands/`   | `--ai copilot`       |
| Cursor         | `.cursor/commands/`   | `--ai cursor`        |
| Gemini CLI     | `.gemini/commands/`   | `--ai gemini`        |
| Qwen Code      | `.qwen/commands/`     | `--ai qwen`          |
| opencode       | `.opencode/commands/` | `--ai opencode`      |
| Codex CLI      | `.codex/commands/`    | `--ai codex`         |
| Windsurf       | `.windsurf/commands/` | `--ai windsurf`      |
| Kilo Code      | `.kilocode/commands/` | `--ai kilocode`      |
| Auggie CLI     | `.augment/commands/`  | `--ai auggie`        |
| Roo Code       | `.roo/commands/`      | `--ai roo`           |

**How configuration works:**

Buildforce installs slash command files (research.md, spec.md, build.md, complete.md, document.md) into your chosen assistant's configuration folder during initialization. Commands become available in your AI chat via `/research`, `/spec`, etc. All templates and scripts are copied to `.buildforce/` in your project directory. You can switch assistants later by manually copying command files between folders.

---

## Contributing

Buildforce is **open source** and welcomes contributions! We're building the future of AI-assisted development together.

### Quick Start for Contributors

```bash
git clone https://github.com/berserkdisruptors/buildforce-cli.git
cd buildforce-cli
npm install
npm run build
npm link
```

### How to Contribute

1. **Check existing issues** - [View open issues](https://github.com/berserkdisruptors/buildforce-cli/issues)
2. **Create an issue** - Describe the problem or feature request
3. **Fork & branch** - Create a feature branch
4. **Use Buildforce for development** - Follow the structured workflow
5. **Test locally** - `npm link` and test your changes
6. **Submit PR** - Describe your changes and link related issues

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for our development roadmap and upcoming features.

---

## Support & Community

- **Website**: [https://buildforce.dev](https://buildforce.dev) - Learn more about Buildforce
- **GitHub Repository**: [https://github.com/berserkdisruptors/buildforce-cli](https://github.com/berserkdisruptors/buildforce-cli)
- **npm Package**: [https://www.npmjs.com/package/@buildforce/cli](https://www.npmjs.com/package/@buildforce/cli)
- **Discord**: [Join our community](https://discord.gg/buildforce) - Get help, share workflows, and connect with other users
- **GitHub Issues**: [Report bugs or request features](https://github.com/berserkdisruptors/buildforce-cli/issues)
- **Discussions**: [Ask questions or share ideas](https://github.com/berserkdisruptors/buildforce-cli/discussions)

> **Note**: Discord server invite link needs to be created and updated above

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Star the Project! ⭐

If Buildforce helps you build better software with AI assistants, please star the project on GitHub. It helps us reach more developers and build a stronger community.

[**Star Buildforce on GitHub**](https://github.com/berserkdisruptors/buildforce-cli)

---

**Made with ❤️ by [Berserk Disruptors](https://github.com/berserkdisruptors)**

_Building the future of AI-assisted development, one context file at a time._
