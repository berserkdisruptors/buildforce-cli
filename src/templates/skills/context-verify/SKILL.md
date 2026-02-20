---
name: context-verify
description: >-
  Verify current branch changes against the context repository. Checks conventions
  for static compliance (naming, structure, patterns) and executes verification
  procedures (build steps, output inspection, end-to-end validation) to confirm
  changes meet established quality criteria.
agents: [claude, cursor, opencode]
user-invocable: true
context: fork
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Verify Changes Against Context Repository

Verify the current branch's changes against the Buildforce context repository. This skill does two distinct things:

1. **Conventions** (static checks): Compare changes against established conventions — naming patterns, file structure, required fields, anti-patterns. Result: violation, warning, or pass.
2. **Verification** (procedural checks): Read verification context files to derive executable steps — build processes, output inspection, end-to-end validation — that the agent must run to confirm changes meet quality criteria. Result: a set of executed procedures with pass/fail outcomes.

User input:

$ARGUMENTS

---

## Step 0: Prerequisites

1. Read `.buildforce/context/_index.yaml` from the current working directory.

**If the conventions or verification domains items are empty:**
- Tell the user: "You don't have any establised conventions or verification rules yet. Run `/context-extract` first or use `/context-add` to manually add some."
- STOP.

2. Verify we're in a git repo:
```bash
git rev-parse --is-inside-work-tree
```

**If not a git repo:**
- Tell the user: "Not in a git repository. Run this from a project root."
- STOP.

3. Determine base branch:
- If `$ARGUMENTS` contains "against {branch}" or specifies a branch name, use that as the base branch
- Otherwise auto-detect the branch this one originated from:

```bash
# Try upstream tracking branch first
git rev-parse --abbrev-ref @{upstream} 2>/dev/null | sed 's|^origin/||'
```

If no upstream is set, find which local branch shares the nearest merge-base:

```bash
current=$(git rev-parse --abbrev-ref HEAD)
git for-each-ref --format='%(refname:short)' refs/heads/ | while read branch; do
  [ "$branch" = "$current" ] && continue
  echo "$(git log --oneline "$branch..$current" 2>/dev/null | wc -l | tr -d ' ') $branch"
done | sort -n | head -1 | awk '{print $2}'
```

This picks the branch with the fewest commits separating it from HEAD (i.e., the closest ancestor).

4. Verify the base branch exists:
```bash
git rev-parse --verify <base>
```

**If base branch not found:**
- Tell the user: "Base branch `{name}` not found. Specify a different base: `/context-verify against develop`"
- STOP.

---

## Step 1: Collect Changes

Gather all changes on the current branch relative to the base branch.

1. Get the list of changed files (committed changes on branch):
```bash
git diff <base>...HEAD --name-only
```

2. Get uncommitted changes:
```bash
git diff --name-only
```

3. Combine both lists into a unified set of changed files (deduplicated).

**Exclude** all files under `.buildforce/` — the context repository itself is out of scope for verification. Only verify source code and project files outside of `.buildforce/`.

4. Get the full diff content for committed changes:
```bash
git diff <base>...HEAD
```

5. Get the full diff content for uncommitted changes:
```bash
git diff
```

**If no changes found anywhere (both lists empty):**
- Tell the user: "No changes to verify."
- STOP.

Store the combined file list and diff content for use in subsequent steps.

---

## Step 2: Quick-Scan for Applicable Rules

This is the fast matching step — read only the `_index.yaml`, not the actual rule files.

For each item in `_index.yaml` under the `conventions` and `verification` domains, determine if it applies to the current changes using these matching strategies:

### 2.1 Type Match (Primary Strategy)

Match changed file paths against patterns described in each convention/verification item's scope, tags, and reference_files. The goal is to connect changed files to the rules that govern them.

Examples of how this matching works (these are illustrative — actual rules come from the repository's `_index.yaml`):

| Changed Files Pattern | Might Match Rules Like |
|----------------------|------------------------|
| Template or config files | Conventions about file structure, naming, required fields |
| Source code files (`.ts`, `.py`, `.go`, etc.) | Quality gates, coding standards, linting rules |
| Any commit on a branch | Branch naming conventions, commit message standards |
| Files in directories flagged by `known_risks` entries | Known risks with matching `module` glob patterns |

Do NOT hardcode rule names — always derive applicable rules from what actually exists in `_index.yaml`.

### 2.2 Enforcement Priority

Rank applicable rules by enforcement level:
1. `strict` — must check, violations are errors
2. `recommended` — should check, violations are warnings
3. `reference` — skip unless directly relevant to changed files

Build the ranked list of applicable rule IDs. Proceed to Step 3 with this list.

---

## Step 3: Read and Extract Rules

For each applicable context file identified in Step 2:

1. Read the full YAML file from `.buildforce/context/{domain}/{filename}.yaml`
2. Separate into two categories based on domain:

### 3A: Convention Files (domain: `conventions`)

Extract static, checkable rules:
- `examples` — patterns that SHOULD appear in matching code
- `violations` — patterns that MUST NOT appear
- `template` — required structure or format
- Specific field requirements (e.g., required frontmatter fields)
- `reference_files` — files that exemplify the convention

### 3B: Verification Files (domain: `verification`)

Extract procedural validation steps. Verification files describe *processes the agent must execute* — not just patterns to match. Read the file carefully to understand:
- What conditions trigger this verification (e.g., "when files in X directory change")
- What steps to run (e.g., "execute the build, extract the output, inspect contents")
- What the expected outcome looks like (e.g., "the packaged archive must contain the new files")
- `known_risks` with `module` glob patterns — flag when changes touch risky areas and surface the documented mitigation

Each verification file may describe a multi-step procedure. Collect these as executable verification procedures for Step 4B.

### Skip Rules That Are
- Purely informational (`enforcement: reference`) unless the changed files directly match
- Not applicable to any file in the change set

---

## Step 4: Execute Checks

### 4A: Convention Compliance (static checks)

For each convention rule extracted in Step 3A, check the diff content and changed file list:

- **Naming**: Check file names against required naming patterns (kebab-case, prefixes, extensions). Check variable/function names in new or modified code lines.
- **Structure**: Check required fields in new/modified template or config files. Check required sections, directory placement. Check file extensions.
- **Quality gates**: Check branch naming against documented patterns. Check for required fields in configuration files.
- **Anti-patterns**: Check for explicitly listed violation patterns. Compare new code against documented examples and anti-patterns.

Classify each convention finding as:
- **violation**: A `strict` rule is clearly broken, or a `recommended` rule has an obvious violation
- **warning**: A `recommended` rule may not be followed, or changes are in a documented risk zone
- **pass**: The rule was checked and the changes comply

### 4B: Verification Procedures (procedural checks)

For each verification procedure extracted in Step 3B, **execute the described steps**. This is not pattern matching — the agent must actively run the procedures described in the verification file.

Examples of what verification procedures might require:
- **Running tests** — the most common and important verification. Use the `test_execution` field to determine which test types and which specific test suites to run based on which modules were changed. Run the exact commands documented in the verification file.
- Running a build process and inspecting the output artifacts
- Extracting an archive and confirming expected files are present
- Executing a command and checking its exit code or output
- Reading generated files and validating their contents against expectations

**Test execution is the primary verification mechanism.** If a verification file contains a `test_execution` field with `module_test_map`, use it to determine exactly which tests to run based on the changed files. For example, if `src/auth/login.ts` changed and the map says auth is covered by `[unit, e2e]`, run both the unit and e2e commands for auth. If the map shows a module has no coverage (`covered_by: []`), report that as a warning — changes to untested modules carry higher risk.

For each procedure:
1. Read the verification file's steps carefully (pay special attention to `test_execution` and `verification_procedures`)
2. Execute each step using the available tools (Bash for commands, Read/Glob/Grep for inspection)
3. Compare actual results against the expected outcomes documented in the verification file
4. Record: **pass** if the procedure's expectations are met, **fail** if not (with details on what diverged)

For `known_risks` entries: flag when changes touch modules with documented risks and surface the risk description and its mitigation guidance as a **warning**.

---

## Step 5: Generate Report

Output the verification report in this format:

```
## Verification Report

Branch: `{current-branch}` -> `{base-branch}`
Files changed: {N} | Conventions checked: {C} | Verification procedures run: {V}

**Combined file list** (committed + uncommitted, deduplicated):

| # | File | Status |
|---|------|--------|
| 1 | `{file-path}` | {Modified/New/Deleted/New (untracked)} |

---

### Convention Violations ({count})

{For each violation:}
N. **{rule-name}** ({enforcement}) - `{file-path}`
   Rule: {what the rule requires}
   Found: {what the diff shows}
   Fix: {specific action to fix}

### Convention Warnings ({count})

{For each warning:}
N. **{rule-name}** - `{file-path}`
   Risk: {description}
   Note: {what to be aware of}

### Conventions Passed ({count})

{For each pass:}
- **{rule-name}** -- {brief explanation of what was checked}

### Verification Procedures ({count})

{For each procedure executed:}
N. **{verification-rule-name}** — {result: PASS or FAIL}
   Procedure: {what was executed}
   {If PASS:} Result: {brief confirmation of what was validated}
   {If FAIL:} Expected: {what should have happened}
   Actual: {what happened instead}
   Fix: {specific action to fix}

### Verification Warnings ({count})

{For each known-risk warning:}
N. **{risk-name}** - `{file-path}`
   Risk: {description}
   Note: {mitigation guidance from the verification file}
```

If a section has zero items, still show the heading with (0) but no items under it.

End the report with a horizontal rule and a summary sentence.

---

## Step 6: Follow-Up

Based on the results, provide a clear next action:

- **If convention violations or verification failures found**: "Found {N} violation(s) and {F} failed verification(s). Want me to fix them?"
- **If only warnings**: "No violations or failures. {N} warning(s) to be aware of - no action needed."
- **If all passed**: "All conventions passed and all verification procedures succeeded. Changes look good."

---

## Error Handling

| Scenario | Message |
|----------|---------|
| Not a git repo | "Not in a git repository. Run this from a project root." |
| Base branch not found | "Base branch `{name}` not found. Specify a different base: `/context-verify against develop`" |
| No context repository | "No context repository found. Run `/context-extract` first." |
| No conventions or verification rules in index | "Context repository has no conventions or verification rules. Run `/context-extract` or `/context-add` to populate it." |
| No changes detected | "No changes to verify." |
