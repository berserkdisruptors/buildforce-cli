---
version: "0.0.35"
description: Build the code changes required for the current spec following the plan, with progress tracking, deviation logging, and iterative refinement.
scripts:
  sh: src/scripts/bash/get-spec-paths.sh --json
  ps: src/scripts/powershell/get-spec-paths.ps1 -Json
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/buildforce.build` to execute implementation. `($ARGUMENTS)` contains iteration-specific instructions or feedback.

**Your task**: Implement the feature by following the spec and plan, tracking progress, logging deviations, validating against requirements, and providing testing guidance.

**Key guidelines**:

1. **Script Execution & Context Loading**: Run `{SCRIPT}` FROM CURRENT WORKING DIRECTORY AND NEVER FROM SOMEWHERE ELSE!. **NEVER proceed** if script fails - display the error message to the user, explain that the `.buildforce` directory was not found, suggest: 1) check if you're in the buildforce root directory (where you ran `buildforce init`), 2) run `buildforce init .` if needed. Parse the JSON response to extract **SPEC_DIR** (absolute path). Load {SPEC_DIR}/spec.yaml and {SPEC_DIR}/plan.yaml into context. **Load {SPEC_DIR}/research.yaml if it exists** - this provides critical implementation context including:

   - **File paths** discovered during research (primary/secondary files)
   - **Mermaid diagrams** showing architecture flows and component relationships
   - **Data models** with properties, types, and relationships
   - **Code snippets** demonstrating patterns and suggested implementations
   - **Architectural decisions** with rationale and trade-offs
   - **External references** to relevant documentation and best practices
   - **TLDR** condensing key research findings for quick reference

   If research.yaml exists, use it to inform implementation decisions - it contains valuable context that may not be fully captured in spec.yaml or plan.yaml. **NEVER proceed** without spec.yaml and plan.yaml loaded (research.yaml is optional but recommended).

2. **Progress Tracking**: Update the status of each task in the plan as you progress - each task has a checkbox, so make sure to check it on completion.

3. **Follow the Plan**: Execute implementation steps sequentially as specified in the plan. Parse $ARGUMENTS for iteration-specific instructions (e.g., "change library X to Y", "fix edge case Z"). Reference specific file paths when creating or modifying code. Keep progress updates concise but informative.

4. **Deviation Logging**: If you deviate from the original plan (due to user instructions, discovered issues, or better approaches), log each deviation in {FEATURE_DIR}/plan.yaml : **Original** → **Actual** → **Reason**. Maintain a running deviation log throughout the build and across iterations. **NEVER hide deviations**—transparency is critical.

5. **Validate Against Spec & Plan**: After completing all implementation steps, cross-check the implementation against BOTH the spec's requirements AND the plan's steps. Verify all functional requirements are met, edge cases are handled, and the plan was followed (or deviations logged). Ensure code compiles with no errors.

6. **Code Quality & Testing Guidance**: Before presenting work, verify: (1) code compiles with no errors, (2) run new or relevant automated tests and report results, (3) check for obvious missing pieces. Then provide testing guidance: **what to test** (specific features/scenarios), **how to test** (steps to verify), and **test results** (if automated tests ran). Think of this as submitting a PR—ensure nothing is obviously broken.

7. **Iterative Refinement**: Expect multiple `/buildforce.build` iterations. Each time `/buildforce.build` is called, determine if this is the first implementation or a subsequent refinement based on $ARGUMENTS. Track deviations across all iterations. Ensure each iteration converges toward the user's desired outcome based on their feedback.

8. **Guideline Compliance Validation** (AI Agent Self-Check):

   After completing implementation but before final validation, check code against project guidelines:

   **Load Guidelines**:

   - Check if `.buildforce/context/_guidelines.yaml` exists
   - If missing: Skip validation and proceed to final validation
   - If exists: Read and parse all guideline categories

   **IMPORTANT Context**: These guidelines are for AI agent education, NOT linting rules for human developers. You are validating YOUR OWN generated code against project conventions to maintain consistency.

   **Validate Strict Enforcement Guidelines**:
   For each guideline with `enforcement: strict`:

   1. **Analyze implemented code** against the guideline pattern
   2. **Check for violations** in files you created or modified
   3. **Fail immediately on violations**: Any violation of a strict guideline fails the build immediately
   4. **Record results** in plan.yaml `guideline_compliance.strict_validations`:
      ```yaml
      - guideline: "Repository Pattern"
        status: "✓ PASS" # or "✗ FAIL"
        checked_files:
          [src/services/UserService.ts, src/services/PostService.ts]
        violation: # Only if FAIL
          file: "src/services/UserService.ts"
          line: 45
          issue: "Direct Prisma call violates Repository Pattern guideline (strict enforcement)"
          fix: "Use UserRepository.findById(id) instead of prisma.user.findUnique()"
      ```
   5. **If violations found**:
      - Report all violations with file/line/issue/fix details
      - **HALT build immediately** - do not proceed to testing
      - User must fix violations or downgrade guideline to 'recommended' before continuing

   **Check Recommended Enforcement Guidelines**:
   For each guideline with `enforcement: recommended`:

   1. **Analyze implemented code** for deviations from pattern
   2. **DO NOT fail build** for recommended deviations
   3. **Log deviations** in plan.yaml `guideline_compliance.recommended_validations`:
      ```yaml
      - guideline: "Error Handling Pattern"
        status: "✓ PASS" # or "⚠ DEVIATION"
        checked_files: [src/services/UserService.ts]
        deviation: # Only if DEVIATION
          original: "Use try-catch with specific error types"
          actual: "Used generic error handling with single catch block"
          reason: "Legacy code integration required generic error boundary for compatibility"
      ```
   4. **Continue with build** - recommended guidelines are advisory only

   **Reference Guidelines** (`enforcement: reference`):

   - These are informational only - no validation required
   - Agent should be aware of them when making implementation decisions
   - No compliance tracking needed

   **Validation Output Format**:

   When presenting validation results, use clear formatting:

   ```
   ## Guideline Compliance Check

   ✓ PASS: Repository Pattern (strict) - 3 files checked
   ✗ FAIL: Database Transaction Flow (strict) - Violation in src/services/OrderService.ts:67
      Issue: Missing explicit transaction commit before external API call
      Fix: Add await transaction.commit() before line 67, or wrap API call in transaction

   ⚠ DEVIATION: Error Handling Pattern (recommended) - src/utils/parser.ts:23
      Reason: Generic catch block used for backward compatibility with legacy system
   ```

   **Performance Consideration**: Keep validation focused on modified files only. Do not scan entire codebase unless guideline explicitly requires it.

Context: {$ARGUMENTS}
