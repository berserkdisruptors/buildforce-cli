## Buildforce Context

This repository includes a curated context layer (`.buildforce/context/`) that captures
architecture decisions, coding conventions, and quality standards so they persist across
AI sessions. Prefer this over rediscovering patterns from raw source.

- `/context-search <query>` — Integrated automatically into your exploration flow. Use it proactively as a standalone skill when you need deeper insight into why something was built a certain way or what conventions apply.
- `/context-add "<knowledge>"` — When you learn something important during a session — a design decision, a convention, a non-obvious gotcha — capture it with this skill before it's lost. It classifies the knowledge into the right domain and grounds it in real code references.
- `/context-extract` — Automated context extraction that discovers structural, convention, and verification context from source files into the repository.
- `/context-verify` — Verifies your current branch changes against established conventions and verification procedures from the context repository. Produces a structured compliance report and a verification checklist. Use this any time you're verifying work — it is more reliable and thorough than ad-hoc checking.
