---
name: context-add
description: >-
  Add new knowledge to the context repository. Classifies the input into the right
  domain (architecture, conventions, or verification), grounds it with real codebase
  examples, and creates a structured context file.
agents: [claude, cursor, opencode]
user-invocable: true
context: fork
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Add Context to Repository

Add a single piece of knowledge to the Buildforce context repository. Classifies the input, grounds it in real codebase examples, and creates a structured context file.

User input:

$ARGUMENTS

---

## Step 0: Prerequisites

Read `.buildforce/context/_index.yaml` from the current working directory.

**If the file does NOT exist:**
- Tell the user: "No context repository found. Run `buildforce init` first to initialize your project."
- STOP.

**If the file exists but all three domains have empty `items[]` arrays:**
- Tell the user: "The context repository is empty. Run `/context-extract` first to bootstrap the context repository, so the new entry has context to relate to."
- STOP.

---

## Step 1: Understand User Intent

Parse `$ARGUMENTS` — the natural language description of knowledge to add.

- Identify the core knowledge, rule, or pattern being established
- Extract the key subject, scope, and intent

**If `$ARGUMENTS` is empty:** Ask the user what knowledge they'd like to add to the context repository. STOP and wait for their response.

---

## Step 2: Check for Existing Context

Before classifying, scan existing context files to avoid duplication.

1. Read the `items[]` arrays from all three domains in `_index.yaml`
2. Look for items with similar ids, descriptions, or overlapping tags
3. If a closely matching item exists:
   - Read the existing file
   - Ask the user whether to **update/merge** into the existing file or **create a new** separate entry
   - If merging: proceed to Step 3 with merge intent, then use Edit to update the file rather than Write to create a new one
   - STOP and wait for user response before continuing

If no match found, proceed to Step 3.

---

## Step 3: Classify into Domain

Read all three schemas to understand target structures:
- `.buildforce/context/architecture/_schema.yaml`
- `.buildforce/context/conventions/_schema.yaml`
- `.buildforce/context/verification/_schema.yaml`

Classify the user's knowledge into one domain using these heuristics:

| Domain | Signal | Examples |
|--------|--------|----------|
| **Architecture** | Describes WHAT exists — components, modules, relationships, design decisions | "The auth module uses JWT with Redis", "The API gateway routes through X" |
| **Conventions** | Describes HOW to do things — patterns, standards, rules for writing code | "Always use typed responses", "Follow repository pattern for DB access" |
| **Verification** | Describes HOW to verify correctness — testing, quality, review, known risks | "Every PR needs tests", "Watch out for N+1 queries in UserService" |

When ambiguous: pick the best fit and explain your reasoning to the user.

---

## Step 4: Ground in Codebase

Search for real files that relate to this knowledge. This step makes the context file concrete and useful rather than abstract.

- Use Glob and Grep to find files that relate to the knowledge
- Read relevant files to find code snippets that exemplify the rule or pattern
- For conventions: look for existing violations if applicable
- For architecture: find the actual implementation files
- For verification: find test files, CI configs, or areas the risk applies to

Collect:
- **Reference files**: Real file paths in the codebase
- **Examples**: Code snippets showing the pattern in action
- **Violations** (conventions only): Counter-examples if they exist

---

## Step 5: Generate Context File

Create a YAML file following the appropriate domain schema (read in Step 3).

### File naming
- kebab-case, semantic, max 50 characters
- Place in: `.buildforce/context/{architecture|conventions|verification}/`

### Required fields by domain

**Architecture:**
```yaml
id: {kebab-case-id}
name: "{Human Readable Name}"
type: structural
status: production  # or in-development, deprecated
created: "{today YYYY-MM-DD}"
last_updated: "{today YYYY-MM-DD}"
summary: |
  {Multi-line description grounded in codebase findings}
```
Plus optional: responsibilities, dependencies, files, interfaces, design_decisions, notes

**Conventions:**
```yaml
id: {kebab-case-id}
name: "{Human Readable Name}"
type: convention
sub_type: {see schema for values}  # code-convention, architectural-pattern, naming-convention, etc.
enforcement: {strict|recommended|reference}
created: "{today YYYY-MM-DD}"
last_updated: "{today YYYY-MM-DD}"
description: |
  {Multi-line description of the convention}
```
Plus optional: examples, violations, reference_files, template

**Verification:**
```yaml
id: {kebab-case-id}
name: "{Human Readable Name}"
type: verification
source: manual
created: "{today YYYY-MM-DD}"
last_updated: "{today YYYY-MM-DD}"
```
Plus optional: quality_standards, test_expectations, review_checklist, known_risks

### Writing the file

- If creating new: use Write to create the file
- If merging into existing (from Step 2): use Edit to merge new content into the existing file — preserve existing sections, append to lists, update outdated content

---

## Step 6: Update _index.yaml

Add the new item to the appropriate domain's `items[]` array in `.buildforce/context/_index.yaml`.

### New item structure

Follow the existing item format in `_index.yaml`:

```yaml
- id: {same as file id}
  file: {domain}/{filename}.yaml
  type: {structural|convention|verification}
  status: extracted
  depth: moderate
  description: {Brief one-line description}
  tags: [{relevant, tags}]
```

Additional fields by domain:
- **Conventions**: add `sub_type:` and `enforcement:`
- **Verification**: add `source: manual`
- **Architecture**: add `related_context:` if applicable

### Update summary

Increment `summary.total_items` by 1.

If merging into an existing file (from Step 2): do NOT add a new item — just update the existing item's `description` and `tags` if needed.

---

## Step 7: Present Summary

Output a brief summary (3-5 lines max):

**For new entries:**
```
Context added: {domain}/{filename}.yaml
  Classification: {type} ({sub_type if convention}, {enforcement if convention})
  Grounded with: {N} reference files, {N} examples
  Reasoning: {One sentence explaining the classification choice}
```

**For merged entries:**
```
Context updated: {domain}/{filename}.yaml
  Merged: {description of what was added}
  Grounded with: {N} reference files, {N} examples
```
