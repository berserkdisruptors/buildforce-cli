# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `/spec` now creates and updates both `spec.yaml` (WHAT) and `plan.yaml` (HOW) in parallel

### Removed

- `/plan` slash command retired; planning responsibilities merged into `/spec`

### Planned

- Enhanced spec templates with more structured requirement types
- Plan validation with automated completeness checks
- Testing integration with built-in test file generation
 - Visualization tools for generating diagrams from specs/plans

## [0.0.1] - 2025-01-15

### Added

- Initial release of Buildforce CLI
- Core spec-driven development workflow with 5 slash commands:
  - `/research` - Gather context and project knowledge
  - `/spec` - Define requirements and specifications
  - `/plan` - Design implementation approach
  - `/build` - Execute implementation with progress tracking
  - `/complete` - Finalize and validate features
- Utility command `/document` for creating context files without specs
- Support for 11 AI coding assistants:
  - Claude Code
  - GitHub Copilot
  - Cursor
  - Gemini CLI
  - Qwen Code
  - opencode
  - Codex CLI
  - Windsurf
  - Kilo Code
  - Auggie CLI
  - Roo Code
- YAML-based spec and plan templates with structured formats
- Shell scripts for workflow automation (bash and PowerShell)
- Context repository system (`.buildforce/context/`) for accumulated project knowledge
- CLI initialization with interactive prompts
- Template download from GitHub releases
- Git repository initialization
- Configuration options:
  - `--ai <assistant>` - Choose AI assistant
  - `--script <type>` - Choose script type (sh/ps)
  - `--here` - Initialize in current directory
  - `--force` - Force merge/overwrite
  - `--no-git` - Skip git initialization
  - `--ignore-agent-tools` - Skip AI agent tool checks
  - `--skip-tls` - Skip SSL/TLS verification
  - `--debug` - Verbose diagnostic output
  - `--github-token <token>` - GitHub API authentication

### Documentation

- Comprehensive README with:
  - Spec-Driven Development philosophy
  - Installation instructions for multiple platforms
  - Quick start guide
  - Complete CLI command reference
  - Detailed workflow documentation with Mermaid diagram
  - Supported AI assistants table
  - Troubleshooting guide
  - Contribution guidelines
  - Roadmap
- MIT License
- Code of Conduct (Contributor Covenant v2.1)

### Technical

- TypeScript implementation with strict mode
- ESModules (import/export)
- Node.js >= 18.0.0 requirement
- npm package published as `@buildforce/cli`
- GitHub repository: `berserkdisruptors/buildforce-cli`

## [0.0.0] - 2025-01-10

### Added

- Project initialization
- Basic CLI structure
- Template system design

---

## Version History Links

[Unreleased]: https://github.com/berserkdisruptors/buildforce-cli/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/berserkdisruptors/buildforce-cli/releases/tag/v0.0.1
[0.0.0]: https://github.com/berserkdisruptors/buildforce-cli/releases/tag/v0.0.0

---

## How to Contribute to This Changelog

When contributing changes:

1. Add your changes under the `[Unreleased]` section
2. Use the following categories:
   - `Added` for new features
   - `Changed` for changes in existing functionality
   - `Deprecated` for soon-to-be removed features
   - `Removed` for now removed features
   - `Fixed` for any bug fixes
   - `Security` in case of vulnerabilities
3. Reference related issues or PRs: `- Description (#123)`
4. Keep descriptions concise but clear

For more information, see [Keep a Changelog](https://keepachangelog.com/).
