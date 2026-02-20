---
name: context-verify
description: >-
  Verify current branch changes against the context repository. Checks conventions
  for static compliance (naming, structure, patterns) and presents verification
  steps to follow (build steps, output inspection, end-to-end validation) as a
  checklist for the user to run.
agents: [claude, cursor, opencode]
user-invocable: true
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Verify Changes Against Context Repository

Verify the current branch's changes against the Buildforce context repository. This skill produces a **report** — it does not execute verification procedures or auto-fix anything. It does two distinct things:

1. **Conventions** (static checks): Compare changes against established conventions — naming patterns, file structure, required fields, anti-patterns. Result: violation, warning, or pass.
2. **Verification** (step checklist): Read verification context files to derive the steps that should be followed — build processes, output inspection, test execution, end-to-end validation — and present them as a checklist. The agent does NOT execute these steps; it compiles them for the user to follow.

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

Use **either/or** logic — never combine uncommitted and committed changes.

### 1.1 Check for staged/unstaged changes first

```bash
git diff --name-only
git diff --cached --name-only
```

Combine these two lists (deduplicated). If the result is non-empty, these are the changes to verify (**pre-commit check** mode). Skip the base branch comparison entirely — Step 0's base branch detection can be skipped too.

Get the full diff content:
```bash
git diff
git diff --cached
```

### 1.2 If working tree is clean, use committed branch changes

If both commands above returned empty, fall back to committed changes against the base branch:

```bash
git diff <base>...HEAD --name-only
```

Get the full diff content:
```bash
git diff <base>...HEAD
```

### 1.3 Filter and validate

**Exclude** all files under `.buildforce/` — the context repository itself is out of scope for verification. Only verify source code and project files outside of `.buildforce/`.

**If no changes found (empty list after filtering):**
- Tell the user: "No changes to verify."
- STOP.

Store the file list and diff content for use in subsequent steps. Track which mode was used (uncommitted vs. committed) for the report header.

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

Extract procedural validation steps. Verification files describe *processes that should be followed* — not just patterns to match. Read the file carefully to understand:
- What conditions trigger this verification (e.g., "when files in X directory change")
- What steps should be followed (e.g., "run the build, extract the output, inspect contents")
- What the expected outcome looks like (e.g., "the packaged archive must contain the new files")
- `known_risks` with `module` glob patterns — flag when changes touch risky areas and surface the documented mitigation

Each verification file may describe a multi-step procedure. Collect these as verification checklist items for Step 4B.

### Skip Rules That Are
- Purely informational (`enforcement: reference`) unless the changed files directly match
- Not applicable to any file in the change set

---

## Step 4: Analyze Changes

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

### 4B: Verification Procedures (compile checklist)

For each verification procedure extracted in Step 3B, **compile the described steps into a checklist** for the user to follow. Do NOT execute any verification steps — read the verification files, match them against the changes, and output the steps as actionable items.

For each applicable verification file:
1. Read the verification file's steps carefully (pay special attention to `test_execution` and `verification_procedures`)
2. Match the changed files against the verification file's scope to determine which steps are relevant
3. Compile each relevant step into a checklist item with: the command to run, what to inspect, and what the expected outcome should be

**Test execution steps:** If a verification file contains a `test_execution` field with `module_test_map`, use it to determine which tests should be run based on the changed files. For example, if `src/auth/login.ts` changed and the map says auth is covered by `[unit, e2e]`, list both the unit and e2e commands as steps to run. If the map shows a module has no coverage (`covered_by: []`), report that as a warning — changes to untested modules carry higher risk.

For `known_risks` entries: flag when changes touch modules with documented risks and surface the risk description and its mitigation guidance as a **warning**.

---

## Step 5: Generate Report

Output the verification report in this format:

```
## Verification Report

Branch: `{current-branch}` {→ `{base-branch}` if committed mode, or "(uncommitted changes)" if pre-commit mode}
Files changed: {N} | Conventions checked: {C} | Verification rules matched: {V}

**Changed files** {("staged/unstaged" or "committed vs {base-branch}")}:

| # | File | Status |
|---|------|--------|
| 1 | `{file-path}` | {Modified/New/Deleted/Staged/Unstaged} |

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

### Verification Rules to Follow ({count})

{count} = number of matched verification rules, NOT the total sub-steps.
Use **bold rule name** as a heading, then a task-list checklist for ordered internal steps.

{For each matched verification rule:}
N. **{verification-rule-name}**
Applies because: {why this rule matched — e.g., "changes to files in src/auth/"}

- [ ] Step 1: {command to run or action to take}
  Expected: {what the outcome should be}
- [ ] Step 2: {next command or action}
  Expected: {expected outcome}
- [ ] ...

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

Based on the results, provide a clear summary:

- **If convention violations found**: "Found {N} convention violation(s). Review the report above."
- **If verification rules matched**: "Found {V} verification rule(s) to follow. Run the steps listed above to validate your changes."
- **If both**: "Found {N} convention violation(s) and {V} verification rule(s) to follow. Review the report above."
- **If only warnings**: "No violations found. {W} warning(s) to be aware of — no action needed."
- **If all conventions passed and no verification steps**: "All conventions passed. No verification steps apply. Changes look good."

---

## Error Handling

| Scenario | Message |
|----------|---------|
| Not a git repo | "Not in a git repository. Run this from a project root." |
| Base branch not found | "Base branch `{name}` not found. Specify a different base: `/context-verify against develop`" |
| No context repository | "No context repository found. Run `/context-extract` first." |
| No conventions or verification rules in index | "Context repository has no conventions or verification rules. Run `/context-extract` or `/context-add` to populate it." |
| No changes detected | "No changes to verify." |
