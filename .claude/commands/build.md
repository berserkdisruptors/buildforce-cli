---
description: Build the code changes required for the current spec following the plan, with progress tracking, deviation logging, and iterative refinement.
---

User input:

$ARGUMENTS

**Context**: The user is invoking `/build` to execute implementation. $ARGUMENTS contains iteration-specific instructions or feedback.

**Your task**: Implement the feature by following the spec and plan, tracking progress, logging deviations, validating against requirements, and providing testing guidance.

**Key guidelines**:

1. **Script Execution & Context Loading**: Run `.buildforce/scripts/bash/get-spec-paths.sh --json` from repo root (script verifies files exist and will fail if missing). Parse the JSON response to extract **FEATURE_DIR** (absolute path). Load {FEATURE_DIR}/spec.yml and {FEATURE_DIR}/plan.yml into context. **NEVER proceed** without both files loaded.

2. **Progress Tracking**: Update the status of each task in the plan as you progress - each task has a checkbox, so make sure to check it on completion.

3. **Follow the Plan**: Execute implementation steps sequentially as specified in the plan. Parse $ARGUMENTS for iteration-specific instructions (e.g., "change library X to Y", "fix edge case Z"). Reference specific file paths when creating or modifying code. Keep progress updates concise but informative.

4. **Deviation Logging**: If you deviate from the original plan (due to user instructions, discovered issues, or better approaches), log each deviation in {FEATURE_DIR}/plan.yml : **Original** → **Actual** → **Reason**. Maintain a running deviation log throughout the build and across iterations. **NEVER hide deviations**—transparency is critical.

5. **Validate Against Spec & Plan**: After completing all implementation steps, cross-check the implementation against BOTH the spec's requirements AND the plan's steps. Verify all functional requirements are met, edge cases are handled, and the plan was followed (or deviations logged). Ensure code compiles with no errors.

6. **Code Quality & Testing Guidance**: Before presenting work, verify: (1) code compiles with no errors, (2) run new or relevant automated tests and report results, (3) check for obvious missing pieces. Then provide testing guidance: **what to test** (specific features/scenarios), **how to test** (steps to verify), and **test results** (if automated tests ran). Think of this as submitting a PR—ensure nothing is obviously broken.

7. **Iterative Refinement**: Expect multiple `/build` iterations. Each time `/build` is called, determine if this is the first implementation or a subsequent refinement based on $ARGUMENTS. Track deviations across all iterations. Ensure each iteration converges toward the user's desired outcome based on their feedback.

Context: {$ARGUMENTS}
