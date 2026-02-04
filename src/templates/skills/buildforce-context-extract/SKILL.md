---
name: buildforce-context-extract
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

# Automatic Context Extraction

## Step 1: Evaluate Whether Extraction Is Warranted

### 1.1 Get Changed Files

Run:
```bash
git diff --name-status HEAD
git status --porcelain
```

### 1.2 Filter Out Trivial Changes

Disregard changes that match ANY of:
- Root-level `*.md` files (README, CHANGELOG, etc.)
- Lock files
- Files under `.buildforce/`
- files that are .gitignored
- Whitespace-only changes (verify with `git diff -w`)

If no files remain after filtering: output "No meaningful changes detected." and STOP.

### 1.3 Assess Change Significance

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

## Step 2: Identify Affected Modules

### 2.1 Group Files by Directory

Group the filtered changed files by their parent directory. Each directory group represents a candidate module.

### 2.2 Name the Modules

Derive a semantic module name from each directory:
- `src/auth/*` → "authentication"
- `src/templates/commands/*` → "slash-commands"
- `src/cli.ts` → "cli-core"
- `src/templates/agents/*` → "context-extractors"

Use your judgment for directories not listed above.

### 2.3 Include Related Files

For each module, check if there are closely related files outside the changed set that should be read for context. For example, if `src/auth/login.ts` changed, also consider `src/middlewares/auth-middleware.ts` or `src/auth/index.ts`.

## Step 3: Spawn Extractor Sub-Agents

Use the Task tool to spawn all three extractors in parallel.

### Structural Extractor

Prompt:
```
The following modules were recently modified:
- {module}: {file_list}

Extract or update structural context for these modules only. Focus on:
1. Architecture patterns used
2. Component relationships
3. Data flow changes
4. API endpoints modified

Do NOT re-extract the entire codebase. Only analyze the changed modules.
Return YAML proposals for context files to create/update.
```

### Conventions Extractor

Prompt:
```
The following code was recently modified:
{changed_files}

Extract or update coding conventions demonstrated in these changes. Focus on:
1. New patterns introduced
2. Consistency with existing conventions
3. Architectural decisions reflected in code

Return YAML proposals for convention files to create/update.
```

### Verification Extractor

Prompt:
```
The following modules were recently modified:
{modules_changed}

Extract or update verification/testing context for these modules. Focus on:
1. Test coverage for changed code
2. Testing patterns used
3. Quality standards demonstrated

Return YAML proposals for verification files to create/update.
```

### Error Handling

- If an extractor times out (> 120s): skip it, continue with the others.
- If an extractor fails: skip it, continue with the others.
- If all three fail: output "❌ Context extraction failed. Run /buildforce.extract manually to retry." and stop.

## Step 4: Apply Proposals and Update Coverage Map

### 4.1 Collect Proposals

Each extractor returns YAML proposals with `action: create` or `action: update` and a `file` path.

Separate them into `created_files` and `updated_files`.

### 4.2 Update _index.yaml

Read `.buildforce/context/_index.yaml`.

For each created file, find the matching entry and set:
```yaml
status: extracted
depth: moderate
last_updated: "{today's date}"
```

For each updated file, find the matching entry and set:
```yaml
depth: deep  # increment from previous depth
last_updated: "{today's date}"
```

If `_index.yaml` does not exist, skip this step.

### 4.3 Output Summary

Use one of these formats depending on the result:

```
✅ Context updated: {created_count} created, {updated_count} updated
   • Created: {file1}, {file2}
   • Updated: {file3}
```

If partial failure:
```
⚠️ Context partially updated: {success_count} file(s), {error_count} extractor(s) failed
   • Run /buildforce.extract to retry
```

Keep output to 3 lines maximum.