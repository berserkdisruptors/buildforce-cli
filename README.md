# Buildforce CLI

**Spec-Driven Development Toolkit for AI-Assisted Software Engineering**

[![npm version](https://img.shields.io/npm/v/@buildforce/cli)](https://www.npmjs.com/package/@buildforce/cli)
[![npm downloads](https://img.shields.io/npm/dm/@buildforce/cli)](https://www.npmjs.com/package/@buildforce/cli)
[![GitHub stars](https://img.shields.io/github/stars/berserkdisruptors/buildforce-cli)](https://github.com/berserkdisruptors/buildforce-cli/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/actions/workflow/status/berserkdisruptors/buildforce-cli/release.yml)](https://github.com/berserkdisruptors/buildforce-cli/actions)

---

## Table of Contents

- [What is Spec-Driven Development?](#what-is-spec-driven-development)
- [What is Buildforce CLI?](#what-is-buildforce-cli)
- [Why Buildforce?](#why-buildforce)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Command Reference](#cli-command-reference)
- [Workflow Overview](#workflow-overview)
  - [Core Workflow Diagram](#core-workflow-diagram)
  - [The 5-Command Workflow](#the-5-command-workflow)
    - [/research](#research---gather-context)
    - [/spec](#spec---define-requirements)
    - [/plan](#plan---design-implementation)
    - [/build](#build---execute-implementation)
    - [/complete](#complete---finalize-and-validate)
  - [Utility Commands](#utility-commands)
    - [/document](#document---create-context-files)
- [Supported AI Assistants](#supported-ai-assistants)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)
- [Links & Resources](#links--resources)

---

## What is Spec-Driven Development?

**Spec-Driven Development (SDD)** is a methodology that brings structure and intent to AI-assisted software development. Instead of jumping straight to code, SDD follows a deliberate process:

1. **Research** - Gather context about the problem, codebase, and requirements
2. **Specify** - Define WHAT needs to be built (requirements, scope, acceptance criteria)
3. **Plan** - Design HOW it will be built (architecture, technology choices, implementation phases)
4. **Build** - Execute the plan with progress tracking and deviation logging
5. **Complete** - Validate against requirements and generate documentation

### Why SDD Matters

When working with AI coding assistants, it's tempting to write code immediately. But without clear specifications and plans:

- Requirements get lost or misunderstood
- Edge cases are overlooked
- Implementation deviates from intent
- Documentation is an afterthought
- Context is lost between sessions

**SDD solves these problems** by creating a paper trail from intent to implementation. Every requirement is traceable. Every design decision is documented. Every deviation is logged. This makes AI-assisted development **transparent, reproducible, and maintainable**.

---

## What is Buildforce CLI?

Buildforce CLI is a command-line tool that implements the Spec-Driven Development workflow through **slash commands** for AI coding assistants like Claude Code, GitHub Copilot, Cursor, and more.

Think of it as a **project initialization tool meets workflow orchestrator**. Run one command to set up a new project with:

- ✅ Slash command templates for `/research`, `/spec`, `/plan`, `/build`, `/complete`, `/document`
- ✅ YAML-based spec and plan templates
- ✅ Shell scripts for workflow automation
- ✅ Context repository for accumulated project knowledge
- ✅ Configuration for 11+ AI assistants

**No more copy-pasting prompts**. No more reinventing workflows. Just initialize your project and start building with structure.

---

## Why Buildforce?

### For Individual Developers

- **Faster Onboarding**: Jump into new projects with a proven workflow already set up
- **Better Documentation**: Specs and plans are generated as you work, not after
- **Clearer Intent**: AI assistants understand exactly what you want to build
- **Reproducible Builds**: Track every decision from requirements to code

### For Teams

- **Shared Workflow**: Everyone follows the same process, from junior to senior developers
- **Better Reviews**: PRs include specs and plans, not just code
- **Knowledge Transfer**: Context files preserve architectural decisions and patterns
- **Onboarding Speed**: New team members can read specs to understand features

### For Open Source Maintainers

- **Transparent Contributions**: Contributors provide specs before code
- **Consistent Quality**: PRs follow a structured workflow
- **Faster Reviews**: Reviewers can validate against specs
- **Better Documentation**: Every feature has accompanying specs and plans

---

## Installation

### Option 1: npm Global Install (Recommended)

```bash
npm install -g @buildforce/cli
```

Verify installation:

```bash
buildforce --version
```

### Option 2: npx (No Installation)

Use Buildforce without installing:

```bash
npx @buildforce/cli [project-name]
```

### Option 3: Git Clone (Development)

Clone and build from source:

```bash
git clone https://github.com/berserkdisruptors/buildforce-cli.git
cd buildforce-cli
npm install
npm run build
npm link
```

### Requirements

- **Node.js**: >= 18.0.0
- **Git**: Required for repository initialization (optional with `--no-git`)
- **AI Assistant**: At least one AI coding assistant installed (Claude Code, Copilot, etc.)

---

## Quick Start

Get up and running in 60 seconds:

### 1. Initialize a New Project

```bash
buildforce my-awesome-app
```

You'll be prompted to:

- Choose your AI assistant (Claude Code, GitHub Copilot, Cursor, etc.)
- Choose script type (Shell or PowerShell)

The CLI will:

- ✅ Create project directory
- ✅ Download latest template
- ✅ Set up slash commands
- ✅ Initialize git repository
- ✅ Configure your chosen AI assistant

### 2. Open in Your AI Assistant

```bash
cd my-awesome-app
# For Claude Code users:
claude .

# For Cursor users:
cursor .

# For GitHub Copilot (VS Code):
code .
```

### 3. Run Your First Workflow

Now use the slash commands in your AI chat:

```
/research authentication patterns in Node.js

/spec Add JWT-based authentication to the API

/plan

/build

/complete
```

**That's it!** You've completed your first Spec-Driven Development cycle.

---

## CLI Command Reference

### Main Command

```bash
buildforce [project-name] [options]
```

**Arguments:**

- `project-name` - Name for your new project directory (optional if using `--here`)

**Options:**

| Option                   | Description                           | Example                  |
| ------------------------ | ------------------------------------- | ------------------------ |
| `--ai <assistant>`       | AI assistant to use                   | `--ai claude`            |
| `--script <type>`        | Script type (`sh` or `ps`)            | `--script sh`            |
| `--here`                 | Initialize in current directory       | `--here`                 |
| `--force`                | Force merge/overwrite (with `--here`) | `--here --force`         |
| `--no-git`               | Skip git repository initialization    | `--no-git`               |
| `--ignore-agent-tools`   | Skip AI agent tool checks             | `--ignore-agent-tools`   |
| `--skip-tls`             | Skip SSL/TLS verification             | `--skip-tls`             |
| `--debug`                | Show verbose diagnostic output        | `--debug`                |
| `--github-token <token>` | GitHub token for API requests         | `--github-token ghp_xxx` |

### AI Assistants

Choose from 11 supported AI assistants:

- `claude` - Claude Code
- `copilot` - GitHub Copilot
- `cursor` - Cursor
- `gemini` - Gemini CLI
- `qwen` - Qwen Code
- `opencode` - opencode
- `codex` - Codex CLI
- `windsurf` - Windsurf
- `kilocode` - Kilo Code
- `auggie` - Auggie CLI
- `roo` - Roo Code

### Script Types

- `sh` - POSIX Shell (bash/zsh) - Default for macOS/Linux
- `ps` - PowerShell - Default for Windows

### Examples

**Basic initialization:**

```bash
buildforce my-app
```

**Initialize in current directory:**

```bash
buildforce --here
```

**Specify AI assistant and script type:**

```bash
buildforce my-app --ai claude --script sh
```

**Initialize without git:**

```bash
buildforce my-app --no-git
```

**Debug mode for troubleshooting:**

```bash
buildforce my-app --debug
```

### Utility Commands

**Check for required tools:**

```bash
buildforce buildforce-check
```

This verifies:

- Node.js version (>= 18.0.0)
- Git availability
- AI assistant installation (if specified)

---

## Workflow Overview

Buildforce implements a 5-command workflow for systematic software development. Each command guides AI assistants through a specific phase of the development lifecycle.

### Core Workflow Diagram

```mermaid
graph LR
    A[/research] --> B[/spec]
    B --> C[/plan]
    C --> D[/build]
    D --> E[/complete]

    F[/document] -.-> G[(Context<br/>Repository)]
    A -.-> G
    E -.-> G

    style A fill:#e1f5ff
    style B fill:#fff3cd
    style C fill:#d1ecf1
    style D fill:#d4edda
    style E fill:#f8d7da
    style F fill:#e2e3e5
    style G fill:#f5f5f5
```

**Legend:**

- **Blue** - Research & Context Gathering
- **Yellow** - Requirements Definition
- **Cyan** - Implementation Planning
- **Green** - Execution
- **Red** - Validation & Completion
- **Gray** - Utility (Context Management)

---

### The 5-Command Workflow

Each slash command serves a specific purpose in the development lifecycle. Here's what each command does and when to use it.

---

#### `/research` - Gather Context

**Purpose**: Gather information needed to write a specification.

**When to use**:

- Starting a new feature (gather context about the problem)
- Understanding existing code (explore codebase patterns)
- Researching best practices (find current approaches)

**Usage:**

```
/research <your-query>
```

**Examples:**

```
/research authentication patterns in this codebase

/research current best practices for error handling in Express.js

/research how pagination is implemented in our API
```

**What happens:**

1. Searches `.buildforce/context/_index.yml` for accumulated project knowledge
2. Explores codebase using grep/glob (if relevant)
3. Fetches current information via web search (if query contains recency indicators)
4. Produces structured report with:
   - File paths discovered
   - Architecture diagrams (Mermaid)
   - Data models
   - Recommendations

**Output format:**

- **Research Summary** - High-level findings
- **Project Context** - Relevant accumulated knowledge
- **Codebase Findings** - Code patterns and file locations
- **External Knowledge** - Best practices and documentation links
- **Next Steps** - Suggested actions

**Pro Tips:**

- Run `/research` BEFORE `/spec` to ensure you have all necessary context
- Use keywords like "current", "latest", "2024", "2025" to trigger web search
- Research output becomes part of the spec context window

---

#### `/spec` - Define Requirements

**Purpose**: Materialize user intent into a structured specification (WHAT to build).

**When to use**:

- After gathering context with `/research`
- When starting a new feature or bugfix
- When you need to clarify requirements

**Usage:**

```
/spec <feature-description>
```

**Examples:**

```
/spec Add JWT-based authentication with email/password login

/spec Fix pagination bug where last page shows empty results

/spec Refactor user service to use dependency injection
```

**What happens:**

1. Creates `.buildforce/specs/NNN-feature-name/` directory
2. Generates `spec.yaml` file with:
   - Problem statement and motivation
   - Functional and non-functional requirements (FR1, NFR1, etc.)
   - Acceptance criteria (AC1, AC2, etc.)
   - Scope (in/out)
   - Design principles
   - Open questions
3. Asks clarifying questions if intent is vague
4. Validates you have sufficient context (suggests `/research` if needed)

**Output format:**

```yaml
id: 001-feature-name
name: "Feature Name"
type: feature
status: draft

summary: |
  Brief description

problem: |
  What problem this solves

functional_requirements:
  - FR1: Specific requirement
  - FR2: Another requirement

acceptance_criteria:
  - AC1: Measurable success criterion
  - AC2: Another criterion

open_questions:
  - Question needing clarification
```

**Pro Tips:**

- Keep specs focused on WHAT, not HOW (save implementation details for `/plan`)
- Answer all open questions before running `/plan`
- Requirements should be testable and measurable
- Use `/spec` multiple times to refine (updates existing spec)

---

#### `/plan` - Design Implementation

**Purpose**: Design the implementation approach (HOW to build).

**When to use**:

- After finalizing the spec with `/spec`
- When you need to refine architecture or design decisions

**Usage:**

```
/plan [optional-instructions]
```

**Examples:**

```
/plan

/plan Use Fastify instead of Express

/plan Prioritize performance over readability
```

**What happens:**

1. Loads `spec.yaml` from current feature directory
2. Makes design decisions:
   - Architecture approach
   - Technology/library choices
   - Design patterns
   - Data/state management
   - File organization
3. Generates `plan.yaml` with:
   - Implementation phases
   - Task breakdown (with checkboxes)
   - Spec requirement traceability (`spec_refs`)
   - Validation checklists
   - Testing guidance
   - Risks and mitigations
4. Presents plan in fixed format (Architecture, Decisions, Files, Phases, Testing, Risks)
5. Asks for approval before suggesting `/build`

**Output format:**

```yaml
id: 001-feature-name-plan
spec_id: "001-feature-name"
type: implementation-plan

approach: |
  High-level strategy

decisions:
  - decision: "Use X instead of Y"
    rationale: "Because Z"

phase_1:
  name: "Phase Name"
  tasks:
    - [ ] Task description
      spec_refs: [FR1, FR2]
      files: [path/to/file.ts]
```

**Pro Tips:**

- Review the plan carefully - this guides implementation
- Run `/plan` multiple times to refine architecture
- Each task links to spec requirements via `spec_refs`
- Plan is completely replaced on each `/plan` run (no iteration tracking)

---

#### `/build` - Execute Implementation

**Purpose**: Execute the implementation following the spec and plan.

**When to use**:

- After approving the plan from `/plan`
- For iterative refinement ("change X to Y", "fix edge case Z")

**Usage:**

```
/build [optional-iteration-instructions]
```

**Examples:**

```
/build

/build Change axios to fetch for HTTP requests

/build Add validation for empty email input
```

**What happens:**

1. Loads `spec.yaml` and `plan.yaml`
2. Executes tasks sequentially
3. Updates checkboxes in `plan.yaml` as tasks complete
4. Logs deviations if implementation differs from plan:
   ```yaml
   deviations:
     - phase: "phase_1"
       task: "Create API endpoint"
       original: "Use Express middleware"
       actual: "Used Fastify plugin"
       reason: "Better TypeScript support"
   ```
5. Validates against BOTH spec requirements AND plan steps
6. Runs tests and provides testing guidance

**Progress Tracking:**

```yaml
phase_1:
  tasks:
    - [x] Create database schema
    - [x] Add migration script
    - [ ] Write API endpoint
```

**Pro Tips:**

- Run `/build` multiple times for iterative refinement
- Deviations are tracked across all iterations (transparency is key)
- Testing guidance is provided (what to test, how to test, results)
- Check that code compiles and tests pass before considering complete

---

#### `/complete` - Finalize and Validate

**Purpose**: Finalize the feature and validate it meets the original intent.

**When to use**:

- After implementation is done and tested
- When ready to generate documentation and context files

**Usage:**

```
/complete [optional-final-notes]
```

**What happens:**

1. Loads `spec.yaml` and `plan.yaml`
2. Validates all spec requirements are implemented
3. Reviews deviation log across all `/build` iterations
4. Generates comprehensive completion report:
   - Requirement validation (all FRs, NFRs, ACs met?)
   - Implementation summary
   - Deviations from plan
   - Files modified
   - Testing status
5. Generates context file for `.buildforce/context/` directory
6. Updates `.buildforce/context/_index.yml`
7. Requires explicit user confirmation before finalizing

**Output:**

- Completion report (validation summary)
- Context file (e.g., `.buildforce/context/001-feature-name.yml`)
- Updated index (`.buildforce/context/_index.yml`)

**Pro Tips:**

- Don't rush to `/complete` - validate thoroughly first
- Review the completion report for any missed requirements
- Context files preserve knowledge for future `/research` queries
- Once complete, the feature is documented in the context repository

---

### Utility Commands

#### `/document` - Create Context Files

**Purpose**: Create context files for existing functionality without going through the full spec-driven workflow.

**When to use**:

- Documenting legacy code
- Capturing architectural decisions
- Recording design patterns
- Building up context repository incrementally

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

**What happens:**

1. Analyzes information in context window
2. Auto-detects context type (module/feature/component/pattern)
3. Generates context file with snake-case filename
4. Updates `.buildforce/context/_index.yml`
5. Automatically updates related context files with cross-references

**Output:**

- Context file (e.g., `.buildforce/context/authentication-module.yml`)
- Updated index with tags for discoverability

**Pro Tips:**

- Prepare context window first (read files, gather info) before running `/document`
- Use for documenting existing code that doesn't have specs
- Natural complement to `/research` (research reads context, document writes context)
- No numeric prefixes on filenames (unlike specs)

---

## Supported AI Assistants

Buildforce works with 11 AI coding assistants. Choose your preferred assistant during initialization.

| AI Assistant   | Configuration Folder | Command Flag    |
| -------------- | -------------------- | --------------- |
| Claude Code    | `.claude/`           | `--ai claude`   |
| GitHub Copilot | `.github/`           | `--ai copilot`  |
| Cursor         | `.cursor/`           | `--ai cursor`   |
| Gemini CLI     | `.gemini/`           | `--ai gemini`   |
| Qwen Code      | `.qwen/`             | `--ai qwen`     |
| opencode       | `.opencode/`         | `--ai opencode` |
| Codex CLI      | `.codex/`            | `--ai codex`    |
| Windsurf       | `.windsurf/`         | `--ai windsurf` |
| Kilo Code      | `.kilocode/`         | `--ai kilocode` |
| Auggie CLI     | `.augment/`          | `--ai auggie`   |
| Roo Code       | `.roo/`              | `--ai roo`      |

**How it works:**

- Buildforce creates slash command files in your chosen assistant's configuration folder
- Commands are accessible via `/research`, `/spec`, etc. in your AI chat
- All templates and scripts are copied to your project directory
- You can switch assistants later by manually copying command files

---

## Troubleshooting

### Common Issues

#### 1. "Node version mismatch" error

**Problem**: Buildforce requires Node.js >= 18.0.0

**Solution**:

```bash
# Check your Node version
node --version

# If version is < 18, upgrade using nvm (recommended)
nvm install 18
nvm use 18

# Or download from nodejs.org
```

#### 2. "Permission denied" errors on macOS/Linux

**Problem**: Shell scripts don't have execute permissions

**Solution**:

```bash
# Make scripts executable
chmod +x .buildforce/scripts/bash/*.sh

# Or re-run initialization with sudo (not recommended)
sudo buildforce my-app
```

#### 3. "Git not found" error

**Problem**: Git is not installed or not in PATH

**Solution**:

```bash
# Check if git is installed
git --version

# If not installed:
# macOS: Install Xcode Command Line Tools
xcode-select --install

# Ubuntu/Debian
sudo apt-get install git

# Windows: Download from git-scm.com

# Or skip git initialization:
buildforce my-app --no-git
```

#### 4. Template download fails with network errors

**Problem**: Firewall, proxy, or GitHub rate limiting

**Solution**:

```bash
# Use GitHub token to avoid rate limits
buildforce my-app --github-token ghp_your_token_here

# Skip TLS verification (not recommended, use with caution)
buildforce my-app --skip-tls

# Enable debug mode for detailed error info
buildforce my-app --debug
```

#### 5. Slash commands not working in AI assistant

**Problem**: Commands aren't recognized by your AI assistant

**Solution**:

1. **Verify command files exist**:

   ```bash
   # For Claude Code
   ls .claude/commands/

   # For GitHub Copilot
   ls .github/commands/
   ```

2. **Restart your AI assistant** - Some assistants need a reload

3. **Check file permissions**:

   ```bash
   # Commands should be readable
   chmod 644 .claude/commands/*.md
   ```

4. **Manually add commands** if auto-setup failed:
   ```bash
   # Copy commands to assistant folder
   cp src/templates/commands/* .claude/commands/
   ```

### Still Having Issues?

- **Check the docs**: Visit [https://buildforce.dev](https://buildforce.dev) for detailed guides
- **Search existing issues**: [GitHub Issues](https://github.com/berserkdisruptors/buildforce-cli/issues)
- **Ask for help**: [GitHub Discussions](https://github.com/berserkdisruptors/buildforce-cli/discussions)
- **Report a bug**: [New Issue](https://github.com/berserkdisruptors/buildforce-cli/issues/new)

---

## Roadmap

Buildforce is under active development. Here's what's coming next:

### v0.1.0 (Q1 2025)

- [ ] **Enhanced spec templates** - More structured requirement types
- [ ] **Plan validation** - Automated checks for plan completeness
- [ ] **Testing integration** - Built-in test file generation
- [ ] **Visualization tools** - Generate diagrams from specs/plans

### v0.2.0 (Q2 2025)

- [ ] **Multi-language support** - Templates in Spanish, French, German
- [ ] **VS Code extension** - Native integration for VS Code users
- [ ] **Team collaboration** - Shared context repository across team members
- [ ] **Spec versioning** - Track spec evolution over time

### v1.0.0 (Q3 2025)

- [ ] **Web UI** - Browser-based spec/plan editor
- [ ] **CI/CD integration** - Automated spec validation in pipelines
- [ ] **Analytics** - Track development velocity and quality metrics
- [ ] **Enterprise features** - SSO, audit logs, compliance reporting

### Future Enhancements

- User testimonials and case studies
- Video tutorials and interactive walkthroughs
- Automated link checking in CI/CD
- Migration guides for upgrading between versions
- Integration with popular project management tools (Jira, Linear, GitHub Projects)

Want to influence the roadmap? [Join the discussion](https://github.com/berserkdisruptors/buildforce-cli/discussions) or [submit a feature request](https://github.com/berserkdisruptors/buildforce-cli/issues/new?template=feature_request.md).

---

## Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, improving documentation, or sharing feedback, your help makes Buildforce better for everyone.

### How to Contribute

1. **Check existing issues** - Someone might already be working on it

   - [View open issues](https://github.com/berserkdisruptors/buildforce-cli/issues)
   - [View open pull requests](https://github.com/berserkdisruptors/buildforce-cli/pulls)

2. **Create an issue** (optional but recommended)

   - Describe the problem or feature request
   - Wait for feedback before starting work
   - [Create new issue](https://github.com/berserkdisruptors/buildforce-cli/issues/new)

3. **Fork the repository**

   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/buildforce-cli.git
   cd buildforce-cli
   ```

4. **Create a branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bugfix-name
   ```

5. **Make your changes**

   - Write clean, well-documented code
   - Follow existing code style
   - Add tests if applicable
   - Update documentation

6. **Test your changes**

   ```bash
   # Build the project
   npm run build

   # Test locally
   npm link
   buildforce test-project --debug

   # Run tests (when available)
   npm test
   ```

7. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: Add amazing new feature"
   # or
   git commit -m "fix: Fix critical bug"
   ```

   **Commit message format**:

   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding tests
   - `chore:` - Maintenance tasks

8. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

9. **Submit a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Describe your changes
   - Link related issues
   - Wait for review

### Coding Standards

- **TypeScript** - Use strict mode, proper types
- **ESModules** - Use import/export (not require)
- **Formatting** - No enforced linter yet, match existing code style
- **Comments** - Explain WHY, not WHAT (code should be self-explanatory)
- **Error handling** - Always handle errors gracefully
- **Documentation** - Update README for user-facing changes

### Testing

Currently, Buildforce doesn't have automated tests. We welcome contributions to add:

- Unit tests for utilities
- Integration tests for CLI commands
- End-to-end tests for workflows

### Documentation

Help improve documentation:

- Fix typos or unclear sections in README
- Add examples to command documentation
- Write tutorials or guides for [buildforce.dev](https://buildforce.dev)
- Improve code comments

### Reporting Bugs

Found a bug? [Create an issue](https://github.com/berserkdisruptors/buildforce-cli/issues/new) with:

- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment (Node version, OS, AI assistant)
- Error messages or screenshots

### Requesting Features

Have an idea? [Create a feature request](https://github.com/berserkdisruptors/buildforce-cli/issues/new) with:

- Use case - Why is this needed?
- Proposed solution - How should it work?
- Alternatives considered
- Additional context

### Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code. Please report unacceptable behavior to the maintainers.

### Need Help?

- **Questions?** - Ask in [Discussions](https://github.com/berserkdisruptors/buildforce-cli/discussions)
- **Stuck?** - Comment on the issue or PR
- **Want to chat?** - [Join our community](https://buildforce.dev/community) (coming soon)

Thank you for contributing to Buildforce! 🚀

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes, new features, and bug fixes.

**Latest Release**: [v0.0.1](https://github.com/berserkdisruptors/buildforce-cli/releases/tag/v0.0.1) - Initial release with core workflow implementation.

---

## License

Buildforce CLI is [MIT licensed](LICENSE).

```
MIT License

Copyright (c) 2025 Berserk Disruptors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Links & Resources

### Official

- **Documentation**: [https://buildforce.dev](https://buildforce.dev)
- **GitHub Repository**: [https://github.com/berserkdisruptors/buildforce-cli](https://github.com/berserkdisruptors/buildforce-cli)
- **npm Package**: [https://www.npmjs.com/package/@buildforce/cli](https://www.npmjs.com/package/@buildforce/cli)
- **Issue Tracker**: [https://github.com/berserkdisruptors/buildforce-cli/issues](https://github.com/berserkdisruptors/buildforce-cli/issues)
- **Discussions**: [https://github.com/berserkdisruptors/buildforce-cli/discussions](https://github.com/berserkdisruptors/buildforce-cli/discussions)

### Community

- **Blog**: [https://buildforce.dev/blog](https://buildforce.dev/blog) (coming soon)
- **Twitter**: [@buildforce_dev](https://twitter.com/buildforce_dev) (coming soon)
- **Discord**: [Join our Discord](https://buildforce.dev/discord) (coming soon)

### Related Projects

- **Spec-Kit**: Original inspiration for Buildforce ([GitHub](https://github.com/berserkdisruptors/spec-kit))
- **Specify**: Early prototype of spec-driven development ([.specify](./inspiration/.specify/))

---

**Made with ❤️ by [Berserk Disruptors](https://github.com/berserkdisruptors)**

**Star the project on [GitHub](https://github.com/berserkdisruptors/buildforce-cli) if you find it useful!** ⭐
