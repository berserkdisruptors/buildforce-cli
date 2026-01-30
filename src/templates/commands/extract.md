---
version: "0.0.42"
description: Extract and persist context from fresh codebases using Context Extractors.
agents: [claude]
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/buildforce.extract` to bootstrap or refine a context repository. This command uses sub-agents (Context Extractors) to extract structural, convention, and verification context iteratively.

**Prerequisites**: Buildforce initialized, context v2.1 structure present.

## Step 1: Check Coverage Map

Read `.buildforce/context/_index.yaml` FROM CURRENT WORKING DIRECTORY.
- If NOT exists or version < 2.1 → **First Run** (Step 2a)
- If exists with version ≥ 2.1 → **Continuation** (Step 2b)

## Step 2a: First Run (Bootstrap)

1. **Scan Codebase**:
   - Read README, root configs (package.json, tsconfig.json, etc.)
   - List directory structure (depth 3)
   - Identify languages, frameworks, project type, scale

2. **Create/Update _index.yaml**:
   - Set version: "2.1", generated_at, codebase_profile
   - Populate `domains.structural.items[]`, `domains.conventions.items[]`, `domains.verification.items[]`
   - All items: status: "discovered", depth: "none"

3. **Generate Mining Plans**:
   - Use `.buildforce/templates/extraction-progress-template.yaml` as reference for plan structure
   - Create `_extraction-progress.yaml` in each domain folder (architecture/, conventions/, verification/)
   - Set target_items, target_depth: "shallow", and verification_criteria specific to discoveries

4. **Deploy Extractors** (Step 3)

5. **Present Summary** (Step 4)

## Step 2b: Continuation

1. Read existing `_index.yaml`

2. **Interpret Prompt** ($ARGUMENTS):
   - "go deeper on X" → Focus on X, target deeper depth
   - "what about Y?" → Extract Y if discovered
   - "clarify Z" → Answer pending question about Z
   - (empty) → Use `extraction.recommended_focus`

3. **Generate Focused Plans**:
   - Create `_extraction-progress.yaml` files targeting specific items based on interpretation
   - Set target_depth based on current depth + 1

4. **Deploy Extractors** (Step 3)

5. **Present Summary** (Step 4)

## Step 3: Deploy Extractors

### 3.1 Generate Plans

Create `_extraction-progress.yaml` in each domain folder using the `.buildforce/templates/extraction-progress-template.yaml` template.

### 3.2 Deploy All Three Extractors in Parallel

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

### 3.3 Validate & Write Proposals

After all extractors return:

1. **Validate** proposals against _index.yaml (check for duplicates, verify reasoning)

2. **Merge** conflicts intelligently (prefer deeper depth, combine insights)

3. **Write** approved context files to domain folders

   For EACH contribution from extractors:
   - If `action: create` → Write new file to domain folder
   - If `action: update` → Replace existing file with proposed content
   - Log each write: `"Wrote {file} ({action})"`

4. **Update** _index.yaml (status, depth, coverage %)

5. **Add** new discoveries to _index.yaml

### 3.4 Verify Materialization

**BEFORE cleanup**, verify all contributions were written:

```
### Files Written This Iteration
| File | Action | Status |
|------|--------|--------|
| {file1} | create | done |
| {file2} | update | done |
...

Total contributions from extractors: {N}
Total files written: {M}
```

**If N ≠ M**: STOP. List missing files and complete writes before proceeding.

### 3.5 Cleanup

Only after verification passes:
- Delete `_extraction-progress.yaml` files from all domain folders

## Step 4: Present Summary

```
## Iteration Complete

Coverage: {before}% → {after}% (+{delta}%)
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

## Depth Model

| Depth | Meaning | Value |
|-------|---------|-------|
| none | Discovered only | On map |
| shallow | Basic structure | Immediate |
| moderate | Relationships | Good for mods |
| deep | Full rationale | Expert |

Context: {$ARGUMENTS}
