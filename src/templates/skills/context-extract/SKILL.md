---
name: context-extract
description: Extract and update context files based on recent implementation changes
user-invocable: true
context: fork
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
---

# Unified Context Extraction

This skill handles all context extraction modes: cold start bootstrap, focused deep-dives, and incremental updates from code changes.

User input:

$ARGUMENTS

---

## CRITICAL RULE: Context Preservation

**Existing context is valuable. Merge intelligently, don't replace blindly.**

When updating existing files:
- **READ** the existing file completely before any modification
- **MERGE** new findings into existing content
- **ADD** new sections (e.g., extension_points, deeper analysis)
- **PRESERVE** structural sections like evolution history, architecture_patterns, related_specs
- **UPDATE** outdated information when the codebase has changed (this is valid)

**Merge, don't replace:**
- Extractor proposes new `extension_points` -> ADD section to file
- Extractor has new `design_decisions` -> APPEND to existing list
- Extractor finds outdated description -> UPDATE it, but keep surrounding context
- Existing file has detailed sections -> preserve them, add new insights

**Avoid:**
- Replacing entire file content with extractor output
- Accidentally deleting sections extractors didn't analyze
- Losing evolution history or architectural details

---

## Step 0: Route to Mode

Read `.buildforce/context/_index.yaml` from the current working directory.

**Decision tree:**

1. If `_index.yaml` does NOT exist or `version` < 2.1:
   -> **COLD START** (Step 1)

2. If `_index.yaml` exists with `version` >= 2.1:
   - If `$ARGUMENTS` is non-empty:
     -> **FOCUSED** (Step 2)
   - If `$ARGUMENTS` is empty:
     -> **INCREMENTAL** (Step 3)

---

## Step 1: Cold Start Mode

Use this mode when no context index exists yet. Bootstraps the entire context repository.

### 1.1 Scan Codebase

- Read README, root configs (package.json, tsconfig.json, etc.)
- List directory structure (depth 3)
- Identify languages, frameworks, project type, scale

### 1.2 Create/Update _index.yaml

- Set version: "2.1", generated_at, codebase_profile
- Populate `domains.structural.items[]`, `domains.conventions.items[]`, `domains.verification.items[]`
- All items: status: "discovered", depth: "none"

### 1.3 Generate Mining Plans

- Use [extraction-progress-template.yaml](assets/extraction-progress-template.yaml) as reference for plan structure
- Create `_extraction-progress.yaml` in each domain folder (architecture/, conventions/, verification/)
- Set target_items, target_depth: "shallow", and verification_criteria specific to discoveries

### 1.4 Deploy Extractors (Step 4)

### 1.5 Present Summary (Step 5 - Full Output)

---

## Step 2: Focused Mode

Use this mode when the user provides specific instructions via `$ARGUMENTS`.

### 2.1 Read Existing _index.yaml

Load the current coverage map and extraction state.

### 2.2 Interpret User Prompt

Parse `$ARGUMENTS`:
- "go deeper on X" -> Focus on X, target deeper depth
- "what about Y?" -> Extract Y if discovered
- "clarify Z" -> Answer pending question about Z
- General topic -> Identify matching items in coverage map

### 2.3 Generate Focused Plans

- Create `_extraction-progress.yaml` files targeting specific items based on interpretation
- Set target_depth to current depth + 1 for each targeted item

### 2.4 Deploy Extractors (Step 4)

### 2.5 Present Summary (Step 5 - Full Output)

---

## Step 3: Incremental Mode

Use this mode when invoked with no user arguments.

### 3.1 Get Changed Files

Run:
```bash
git diff --name-status HEAD
git status --porcelain
```

### 3.2 Filter Out Trivial Changes

Disregard changes that match ANY of:
- Root-level `*.md` files (README, CHANGELOG, etc.)
- Lock files
- Files under `.buildforce/`
- Files that are .gitignored
- Whitespace-only changes (verify with `git diff -w`)

If no files remain after filtering:
- Check `extraction.recommended_focus` in `_index.yaml`
- If recommended_focus is non-empty: treat as Focused mode targeting those items (go to Step 2.3 with recommended_focus as the prompt)
- If recommended_focus is also empty: output "No meaningful changes detected." and STOP.

### 3.3 Assess Change Significance

**Proceed with extraction if ANY of these are true**:
- 1 or more files were modified or added
- At least 1 new file was created that introduces new functionality
- Changes span 2 or more distinct directories/modules
- Changes include new exports, new classes, new API endpoints, or new data models

**Skip extraction if ALL of these are true**:
- Changes are minor (renaming, comment edits, import reordering, typo fixes)
- No structural or behavioral change to the codebase
- Simple code refactor

If skipping: output "Changes are too minor for extraction." and STOP.

### 3.4 Identify Affected Modules

Group the filtered changed files by their parent directory. Each directory group represents a candidate module.

Derive a semantic module name from each directory:
- `src/auth/*` -> "authentication"
- `src/templates/commands/*` -> "slash-commands"
- `src/cli.ts` -> "cli-core"
- `src/templates/agents/*` -> "context-extractors"

Use your judgment for directories not listed above.

For each module, check if there are closely related files outside the changed set that should be read for context.

### 3.5 Generate Scoped Plans

- Create `_extraction-progress.yaml` in each domain folder
- Set target_items to only the affected modules
- Set target_depth: "moderate"
- Include a preamble in each plan: "These modules changed: {list}"

### 3.6 Deploy Extractors (Step 4)

### 3.7 Present Summary (Step 5 - Compact Output)

---

## Step 4: Deploy Extractors

This step is shared across all modes. The extractors are plan-driven - they read `_extraction-progress.yaml` and execute accordingly.

### 4.1 Generate Plans

Create `_extraction-progress.yaml` in each domain folder using the [extraction-progress-template.yaml](assets/extraction-progress-template.yaml) template.

The plan content varies by mode:
- **Cold Start**: All discovered items, target_depth: "shallow", preamble: "Entire codebase, shallow extraction"
- **Focused**: User-specified items, target_depth: current + 1, preamble: "User wants: {$ARGUMENTS}"
- **Incremental**: Changed modules only, target_depth: "moderate", preamble: "These modules changed: {list}"

### 4.2 Deploy All Three Extractors in Parallel

Use the Task tool to spawn all three Context Extractor sub-agents **simultaneously**:

**IMPORTANT**: Deploy all extractors in a single message with three parallel Task tool calls:

1. **buildforce-structural-extractor**: Extracts architecture/structural context
   - Reads plan from `.buildforce/context/architecture/_extraction-progress.yaml`
   - Returns proposals for structural context files

2. **buildforce-conventions-extractor**: Extracts convention/standards context
   - Reads plan from `.buildforce/context/conventions/_extraction-progress.yaml`
   - Returns proposals for convention context files

3. **buildforce-verification-extractor**: Extracts verification/quality context
   - Reads plan from `.buildforce/context/verification/_extraction-progress.yaml`
   - Returns proposals for verification context files

Each extractor will:
- Read their plan from the `_extraction-progress.yaml` file
- Read their schema from `_schema.yaml`
- Return YAML proposals (contributions, new_discoveries, questions_for_user)

### 4.3 Error Handling

- If an extractor times out (> 120s): skip it, continue with the others.
- If an extractor fails: skip it, continue with the others.
- If all three fail: output "Context extraction failed. Run /buildforce.extract manually to retry." and STOP.

### 4.4 Validate & Write Proposals

After all extractors return:

1. **Validate** proposals against _index.yaml (check for duplicates, verify reasoning)

2. **Merge** conflicts intelligently (prefer deeper depth, combine insights)

3. **Write** approved context files to domain folders

   For EACH contribution from extractors:
   - If `action: create` -> Write new file to domain folder
   - If `action: update` -> **MERGE into existing file** (see Context Preservation rules above)
   - Log each write: `"Wrote {file} ({action})"`

   **MERGE RULES for `action: update`:**
   1. READ the existing file FIRST - understand its full structure
   2. IDENTIFY what the extractor is adding (new sections, deeper insights)
   3. ADD new sections to the existing file (e.g., new `extension_points`)
   4. APPEND new items to existing lists (e.g., add to `design_decisions[]`)
   5. PRESERVE structural sections (evolution history, architecture_patterns, related_specs)
   6. UPDATE outdated content if codebase changed, but keep surrounding context

4. **Update** _index.yaml (status, depth, coverage %)

5. **Add** new discoveries to _index.yaml

### 4.5 Verify Materialization

**BEFORE cleanup**, verify all contributions were written:

```
### Files Written This Iteration
| File | Action | Status |
|------|--------|--------|
| {file1} | create | done |
| {file2} | update (merged) | done |
...

Total contributions from extractors: {N}
Total files written: {M}
```

**If N != M**: STOP. List missing files and complete writes before proceeding.

### 4.6 Cleanup

Only after verification passes:
- Delete `_extraction-progress.yaml` files from all domain folders

---

## Step 5: Apply & Output

Output format depends on the mode that was used.

### Full Output (Cold Start & Focused modes)

Display a visual coverage map followed by iteration summary.

#### Coverage Map Visualization

Generate a tree view of all context items organized by domain, showing depth with visual bars:

```
CONTEXT COVERAGE MAP
===============================================================================

ARCHITECTURE ({count} items)                               WHAT exists?
--- {item-id} ..................... [{depth-bar}] {depth}  {short description}
--- {item-id} ..................... [{depth-bar}] {depth}  {short description}
--- {item-id} ..................... [{depth-bar}] {depth}  {short description}

CONVENTIONS ({count} items)                                HOW we do things?
--- {item-id} ..................... [{depth-bar}] {depth}  {short description}
--- {item-id} ..................... [{depth-bar}] {depth}  {short description}

VERIFICATION ({count} items)                               HOW to verify?
--- {item-id} ..................... [{depth-bar}] {depth}  {short description}
--- {item-id} ..................... [{depth-bar}] {depth}  {short description}

-------------------------------------------------------------------------------
DEPTH LEGEND: [....] shallow  [##..] moderate  [####] deep

PENDING DISCOVERIES (not yet extracted):
  + {discovery-id} ({domain}) .............. {priority} priority
```

**Depth bar encoding:**
- `[....]` = shallow (basic structure documented)
- `[##..]` = moderate (relationships and dependencies documented)
- `[####]` = deep (full rationale, edge cases, extension points documented)

**Formatting rules:**
- Pad item IDs with dots to align depth bars at consistent column
- Keep descriptions concise (3-5 words max)
- List pending discoveries at bottom with `+` prefix

#### Iteration Summary

After the coverage map, show:

```
## Iteration {N} Complete

Coverage: {before}% -> {after}% (+{delta}%)
Items extracted: {count} | New discoveries: {count}

### What We Learned
- {key insight 1}
- {key insight 2}

### Questions for You
- {question from extractors}

### Recommended Next
- {item}: {reason for focus}

---
State preserved in _index.yaml. Run `/buildforce.extract` to continue,
or `/buildforce.extract "go deeper on X"` to focus on specific areas.
```

### Compact Output (Incremental mode)

Keep output to 3 lines maximum. Use one of these formats:

**Success:**
```
Context updated: {created_count} created, {updated_count} updated
   Created: {file1}, {file2}
   Updated: {file3}
```

**Partial failure:**
```
Context partially updated: {success_count} file(s), {error_count} extractor(s) failed
   Run /buildforce.extract to retry
```

---

## Depth Model

| Depth | Meaning | Value |
|-------|---------|-------|
| none | Discovered only | On map |
| shallow | Basic structure | Immediate |
| moderate | Relationships | Good for mods |
| deep | Full rationale | Expert |
