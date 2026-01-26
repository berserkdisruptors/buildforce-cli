<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.png">
  <source media="(prefers-color-scheme: light)" srcset=".github/assets/logo-light.png">
  <img src=".github/assets/logo.png" alt="BuildForce CLI Logo" width="250"/>
</picture>

**Consistent, reliable and efficient framework for AI-assisted engineering**

[![npm version](https://img.shields.io/npm/v/@buildforce/cli)](https://www.npmjs.com/package/@buildforce/cli)
[![npm downloads](https://img.shields.io/npm/dm/@buildforce/cli)](https://www.npmjs.com/package/@buildforce/cli)
[![GitHub stars](https://img.shields.io/github/stars/berserkdisruptors/buildforce-cli)](https://github.com/berserkdisruptors/buildforce-cli/stargazers)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)

</div>

---

Buildforce brings **engineering discipline to AI-assisted development** through CLI initialization and slash commands for AI coding agents.

It materializes user intent into structured specifications, generates actionable plans, and tracks execution with full traceability. By creating a persistent **context repository** that accumulates important context across sessions, it enables AI agents to make reliable decisions and maintain architectural consistency as your project grows.

Instead of re-explaining architectural decisions every time you start a new feature, Buildforce preserves them within your repository where they are automatically referenced by your AI agent.

## Why Buildforce?

AI agents typically start fresh with each session, often leading to inconsistent implementations or "amnesic" behavior where past decisions are forgotten. Buildforce solves this by anchoring your AI assistant to your project's accumulated history.

This approach ensures:

- **Consistency**: New features align with existing patterns and architecture.
- **Reliability**: Requirements are captured and validated before code is written.
- **Efficiency**: Less time spent re-explaining context, more time building.

Context persists in version-controlled YAML files alongside your code, so your project's context repository grows smarter with every feature you complete.

## What Makes It Different

| AI Assistant only                             | AI Assistant + Buildforce                                                |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| Context lost after each session               | Context persists in `.buildforce/context/`                               |
| No workflow structure                         | Flexible but structured workflows                                        |
| Requirements exist only in conversation       | User intent captured in `spec.yaml` with acceptance criteria             |
| Plans exist only in specific modes            | The captured intent is automatically converted into a plan for iteration |
| Implementation deviations go untracked        | Deviations logged with rationale (Original → Actual → Reason)            |
| Architectural decisions forgotten             | Decisions preserved, searchable, and enforced via conventions/           |
| Knowledge lives in individual developer heads | Shared context repository for team-wide knowledge                        |
| Each feature starts from scratch              | Each feature builds on accumulated project context                       |

## Quick Start

### Installation

Install the @buildforce/cli package globally:

```bash
npm install -g @buildforce/cli
```

Then initialize in a project:

```bash
buildforce init .
```

Initialize a new project:

```bash
buildforce init my-project
```

Or with npx:

```bash
npx @buildforce/cli init .
```

<div align="center">
<img src=".github/assets/screenshot-init.png" alt="Buildforce initialization screenshot" width="700"/>
</div>

### Upgrading to the Latest Version

To upgrade an existing Buildforce project to the latest version:

```bash
buildforce upgrade
```

The upgrade command will:

- **Interactively prompt** you to select or modify your AI assistants (matching the init experience)
- Update slash command templates to the latest versions
- Preserve your existing configuration while allowing you to modify it
- Pre-select your currently configured AI assistants for easy modification

**Options:**

```bash
# Skip the interactive prompt and merge specific AI assistant(s)
buildforce upgrade --ai claude

# Specify script type (sh/bash/ps/cmd)
buildforce upgrade --script sh

# Debug mode for troubleshooting
buildforce upgrade --debug
```

### Your First Workflow (Hello Buildforce)

Open your AI assistant (Claude Code, Cursor, etc.) in any existing project and run:

```
/buildforce.research the architecture and structure of this codebase

/buildforce.plan Update README.md to fix any inconsistencies with actual project structure and features

/buildforce.build

/buildforce.complete
```

This workflow works on any codebase! Buildforce will analyze your project, identify inconsistencies, and fix them systematically. Context from `/buildforce.research` informs your spec. Spec requirements guide the plan. Build executes with deviation tracking. Completion validates everything and saves knowledge to your context repository for future work.

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
    /buildforce.research ─────┘           │
         ↓                                │
    /buildforce.plan (creates artifacts)  |
         ↓                                │
    /buildforce.build (implements plan)   │
         ↓                                │
    /buildforce.complete ─────────────────┘
```

**What happens at each command:**

- `/buildforce.research`: Searches `.buildforce/context/` for accumulated knowledge, explores codebase patterns, and fetches external info if needed.
- `/buildforce.plan`: Materializes user intent into structured requirements (functional, non-functional, acceptance criteria) saved as `spec.yaml` and actionable plan saved as `plan.yaml`. Loads conventions from `conventions/` as highest-priority context.
- `/buildforce.build`: Executes plan phases sequentially, updates progress, and logs deviations from the plan. Validates code compliance against conventions if `conventions/` folder exists.
- `/buildforce.complete`: Validates that all requirements are met, generates context files from the work done, and updates the context repository.
- `/buildforce.document`: Standalone utility for documenting existing code. Use `/buildforce.document conventions` to capture project conventions.

**Workflow scenarios:**

1. **Basic workflow** (recommended for simple updates):

   ```
   /buildforce.plan → /buildforce.build
   ```

2. **Full workflow** (recommended for new features and bug fixes):

   ```
   /buildforce.research → /buildforce.plan → /buildforce.build → /buildforce.complete
   ```

3. **Documentation workflow** (manual context contribution):

   ```
   /buildforce.research [topic] → /buildforce.document [module]
   ```

4. **Conventions workflow** (capture and enforce conventions):
   ```
   /buildforce.document conventions → /buildforce.plan [feature] → /buildforce.build → /buildforce.complete
   ```

5. **Standalone workflow** (quick ad-hoc changes without session):
   ```
   /buildforce.build [describe your change]
   ```
   When no active session exists, `/buildforce.build` enters standalone mode—exploring the codebase, presenting a quick plan, asking for confirmation, and optionally creating context files for significant changes.

The key insight: Buildforce isn't just about individual commands. It's about how commands feed context forward (research informs planning, planning guides build, build enriches context). This orchestration prevents context loss and creates knowledge that compounds over time.

## Commands

### /buildforce.research - Gather Context

**Purpose**: Search accumulated project context, explore codebase patterns, and fetch current information.

**Usage:**

```
/buildforce.research <your-query>
```

**Examples:**

```
/buildforce.research authentication patterns in this codebase

/buildforce.research current best practices for error handling in Express.js 2025

/buildforce.research how pagination is implemented in our API
```

**What it does:**

Searches your project's accumulated context repository first, then explores your codebase and fetches current information from the web when needed. Produces a structured report with file paths, architecture diagrams, data models, and actionable recommendations. Research findings persist in conversation history and can be materialized into structured artifacts during planning, ensuring your work is always informed by existing patterns and best practices.

**Pro tip**: Run `/buildforce.research` before `/buildforce.plan` to ensure plans are informed by existing patterns.

---

### /buildforce.plan - Define Requirements & Plan

**Purpose**: Materialize user intent into a structured specification defining WHAT needs to be built and HOW to build it.

**Usage:**

```
/buildforce.plan <feature-description>
```

**Examples:**

```
/buildforce.plan Add JWT-based authentication with email/password login and token refresh

/buildforce.plan Fix pagination bug where last page returns empty results

/buildforce.plan Refactor user service to use repository pattern with dependency injection
```

**What it does:**

Converts your feature description into a structured specification with clear requirements, acceptance criteria, and scope boundaries. Creates both a `spec.yaml` (defining WHAT to build) and `plan.yaml` (defining HOW to build it) in a timestamped folder. If you've done research beforehand, it intelligently materializes those findings into a structured file. When requirements are unclear, it asks clarifying questions to ensure everyone's aligned before implementation begins.

**Pro tip**: Run `/buildforce.plan` multiple times to refine requirements. Since artifacts are persisted, you can perform **intentional compaction**: clear your context window or start a fresh session, then run `/buildforce.plan` again to resume with a clean slate.

---

### /buildforce.build - Execute Implementation

**Purpose**: Execute implementation with automatic mode detection—follows an established plan when a session exists, or provides a lightweight standalone flow for quick ad-hoc changes.

**Usage:**

```
/buildforce.build [instructions]
```

**Dual-mode behavior:**

- **With active session** (after `/buildforce.plan`): Executes the plan with progress tracking, deviation logging, and validation against spec requirements.
- **Without active session** (standalone mode): Explores the codebase, presents a quick plan, asks for confirmation, implements, and optionally creates context files for significant changes.

**Examples (with session):**

```
/buildforce.build

/buildforce.build Change axios to fetch for HTTP requests

/buildforce.build Add validation for empty email field
```

**Examples (standalone mode):**

```
/buildforce.build Add retry logic to API calls

/buildforce.build Fix the null check in user validation

/buildforce.build Add logging to the init command
```

**What it does:**

When a session exists, executes your implementation following the spec and plan, checking off tasks as work progresses and logging any deviations from the original approach. Validates the work against both requirements and plan steps, runs tests, and provides clear guidance on what still needs verification.

When no session exists, enters standalone mode: explores affected files, presents a simple plan (goal, files, approach, risks), asks for confirmation before implementing, and creates context files for significant changes. This preserves buildforce's intelligent approach for quick tasks without the ceremony of a full spec-driven workflow.

**Pro tip**: Use standalone mode for quick fixes, small features, or targeted improvements. For complex changes affecting multiple files or architectural decisions, the full workflow (`/buildforce.plan → /buildforce.build`) provides better traceability.

---

### /buildforce.complete - Finalize and Validate

**Purpose**: Finalize feature by validating requirements, generating context files, and clearing active session state.

**Usage:**

```
/buildforce.complete [optional-final-notes]
```

**What it does:**

Validates that all requirements are met, reviews the deviation log, and generates a comprehensive completion report. Captures the knowledge from your feature (design decisions, key files, implementation choices) into structured context files that live in your project's context repository. Updates cross-references and clears the active session state. Once complete, this feature's knowledge becomes searchable for future work.

**Pro tip**: Don't rush to `/buildforce.complete`. Validate thoroughly first. Once complete, the feature knowledge enters your context repository and will inform future `/buildforce.research` queries.

---

### /buildforce.document - Create Context Files

**Purpose**: Document existing functionality without a full workflow cycle.

**Usage:**

```
/buildforce.document <topic-or-module>
```

**Examples:**

```
/buildforce.document authentication module

/buildforce.document error handling patterns

/buildforce.document database connection pooling strategy
```

**What it does:**

Creates or updates structured context files in your project's knowledge repository by analyzing conversation history. Works independently of the main workflow—perfect for documenting existing code, architectural patterns, or legacy components. Intelligently determines whether to create new files or update existing ones, automatically resolves naming conflicts, and maintains cross-references.

**Pro tip**: Prepare context window first (read files, discuss architecture) before running `/buildforce.document`. The command analyzes conversation history to extract documentation.

**Conventions Mode**: Capture project-wide conventions and coding standards using `/buildforce.document conventions`. Creates individual convention files in `conventions/` folder with architectural patterns, naming conventions, and code standards that AI agents enforce during `/buildforce.build`. Two workflows available:

```
/buildforce.document conventions
```

Creates or updates conventions from conversation (manual mode). Discuss conventions in chat, then run command to capture them as individual files.

```
/buildforce.document scan conventions
```

Bootstrap initial conventions by analyzing existing codebase patterns (scan mode). Detects consistent patterns across 5+ files with 95%+ consistency.

**Enforcement levels**:

- **strict**: Build fails on violation (use for critical conventions)
- **recommended**: Logs warnings only (use for best practices)
- **reference**: Context only, no validation (use for informational patterns)

Conventions are loaded during `/buildforce.plan` (as planning context), validated during `/buildforce.build` (code compliance check), and can auto-evolve via `/buildforce.complete` (pattern detection).

---

## Session Management

Buildforce supports managing multiple development sessions simultaneously. Each session tracks a distinct feature or task with its own spec, plan, and research artifacts. Use the `buildforce session` CLI command to switch between active sessions:

```bash
buildforce session
```

**What it does:**

Opens an interactive picker displaying all active development sessions (draft or in-progress status). Navigate with arrow keys, press Enter to switch to the selected session. The currently active session is marked with a green indicator.

**Example workflow:**

```bash
# Start multiple features
/buildforce.plan Add user authentication with JWT

# Switch to work on something else
/buildforce.plan Implement caching layer for API responses

# Switch back to first feature
buildforce session
# (Select "Add user authentication with JWT" from picker)

/buildforce.build
# Continues work on authentication feature
```

**When to use:**

- You need to pause one feature to handle urgent work on another
- You're maintaining multiple features in parallel (development, bugfix, refactor)
- You want to resume work on a previously paused session

**Note:** Only sessions with status `draft` or `in-progress` appear in the picker. Completed sessions are automatically filtered out.

---

## Supported AI Agents

Buildforce works with 11 AI coding agents: Claude Code, Cursor, Codex CLI, Gemini CLI, GitHub Copilot, Windsurf, Kilo Code, Roo Code and Auggie CLI.

However, at the moment, not all of them are fully tested. That's why we recommend using **Claude Code** or **Cursor** if you are just getting started.

But if you prefer some of the other supported agents, please give it a try and submit an issue if you see something that doesn't work as expected. Open a new issue if you want to add a new agent to the list.

**How configuration works:**

Buildforce installs slash command files (research.md, plan.md, build.md, complete.md, document.md) into your chosen assistant's configuration folder during initialization. Commands become available in your AI chat via `/buildforce.research`, `/buildforce.plan`, etc. All templates and scripts are copied to `.buildforce/` in your project directory. You can switch assistants later by manually copying command files between folders.

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
3. **Fork & branch** - Create a feature branch following our naming convention
4. **Use Buildforce for development** - Follow the structured workflow
5. **Test locally** - `npm link` and test your changes
6. **Submit PR** - Describe your changes and link related issues

---

## Support & Community

- **Website**: [https://buildforce.dev](https://buildforce.dev) - Learn more about Buildforce
- **GitHub Repository**: [https://github.com/berserkdisruptors/buildforce-cli](https://github.com/berserkdisruptors/buildforce-cli)
- **npm Package**: [https://www.npmjs.com/package/@buildforce/cli](https://www.npmjs.com/package/@buildforce/cli)
- **GitHub Issues**: [Report bugs or request features](https://github.com/berserkdisruptors/buildforce-cli/issues)
- **Discussions**: [Ask questions or share ideas](https://github.com/berserkdisruptors/buildforce-cli/discussions)

---

## License

Apache License 2.0 License - see [LICENSE](LICENSE) for details.

---

## Star the Project! ⭐

If Buildforce helps you build better software with AI assistants, please star the project on GitHub. It helps us reach more developers and build a stronger community.

[**Star Buildforce on GitHub**](https://github.com/berserkdisruptors/buildforce-cli)

---

**Made with 💪 by [Berserk Disruptors](https://github.com/berserkdisruptors)**

_Building the future of AI-assisted development, one context file at a time._
