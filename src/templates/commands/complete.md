---
description: Finalize the feature implementation, validate that the end result matches the original intent, and generate a completion report.
---

The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

$ARGUMENTS

The `/complete` command does not expect arguments, but if the user provides any ($ARGUMENTS), consider them as final notes or context for the completion report.

Goal: Explicitly confirm that the implementation is complete, validate that the end result matches the original specification and intent, and generate a comprehensive completion report summarizing the entire workflow.

Prerequisites:
- A specification MUST exist from a prior `/spec` command in this conversation.
- A plan MUST exist from a prior `/plan` command in this conversation.
- At least one `/build` iteration MUST have been completed in this conversation.
- If any prerequisite is missing, instruct the user to complete the missing step(s) first.

Execution steps:

1. **Verify Prerequisites**: Ensure the complete workflow has been executed.
   - Check for specification (from `/spec`)
   - Check for plan (from `/plan`)
   - Check for build completion (from `/build`)
   - If any is missing, STOP and instruct: "Cannot complete. Missing: [spec/plan/build]. Please complete the workflow first."

2. **Load Workflow Artifacts**: Retrieve all key artifacts from this conversation:
   - Specification document
   - Implementation plan
   - Build iterations (initial + any refinements)
   - Deviation log (if any deviations were recorded during `/build`)

3. **Final Validation**: Perform a comprehensive check of the implementation:
   - **Spec Alignment**: Verify that every requirement in the spec has been implemented.
     * List each requirement and confirm its implementation status.
     * Flag any unmet requirements (if any).
   - **Plan Adherence**: Verify that the implementation followed the plan (or recorded deviations).
     * Confirm all planned steps were completed.
     * Review the deviation log (if any).
   - **Code Quality**: Check for:
     * Syntax errors or issues
     * Test coverage (if tests exist)
     * Edge case handling
     * Error handling
   - **User Expectations**: Ask yourself: "Does this implementation solve the user's original problem as stated in the spec?"

4. **Generate Completion Report**: Create a structured report with the following sections:

   ## Feature Completion Report

   ### Overview
   - **Feature**: [Brief description from spec]
   - **Completion Date**: [Today's date]
   - **Total Build Iterations**: [Number of `/build` iterations]

   ### Specification Summary
   - [Brief recap of what was specified]
   - **Requirements Met**: [X/Y requirements completed]

   ### Implementation Summary
   - **Files Created**:
     * `path/to/file1.ts`
     * `path/to/file2.ts`
   - **Files Modified**:
     * `path/to/existing/file.ts`
   - **Key Implementation Details**:
     * [High-level summary of approach]
     * [Notable design decisions]

   ### Deviation Log (if applicable)
   - [List any deviations from the original plan]
   - [Include rationale for each deviation]
   - If no deviations: "No deviations from the original plan."

   ### Testing & Validation
   - **Tests Written**: [Yes/No, with file paths if applicable]
   - **Test Results**: [Pass/Fail status]
   - **Edge Cases Covered**: [List key edge cases handled]

   ### Final Validation
   -  All spec requirements implemented
   -  Plan followed (or deviations logged)
   -  Tests passing (if applicable)
   -  Code quality verified
   -  User expectations met

   ### Next Steps (optional)
   - [Any follow-up actions, improvements, or documentation needed]
   - [Suggestions for future enhancements]

5. **Present Completion Report to User**:
   - Display the complete report.
   - Highlight any unmet requirements or issues (if any exist).
   - Ask: "Does this completion report accurately reflect the work done? Are there any final adjustments needed before closing this feature?"

6. **Final Confirmation**:
   - If the user confirms satisfaction:
     * Display: " Feature marked as complete. Great work!"
     * Suggest: "Ready to start a new feature? Run `/research` or `/spec` to begin."
   - If the user identifies issues:
     * Suggest: "Run `/build [instructions]` to address the issues, then return to `/complete` when ready."

7. **Clear Spec Session State** (when user confirms completion):
   - Delete `.buildforce/.current-spec` file to reset session tracking
   - This ensures the next `/spec` command starts fresh for a new feature
   - Command: `rm -f .buildforce/.current-spec` (or PowerShell: `Remove-Item .buildforce/.current-spec -ErrorAction SilentlyContinue`)
   - Report: "Cleared spec session state for next feature."

8. **Cleanup Recommendations** (optional):
   - Suggest any cleanup actions (e.g., "Consider running tests", "Update documentation", "Create a PR").
   - Provide a summary of artifacts created during the workflow (spec, plan, deviation log).

Behavior rules:
- NEVER mark a feature as complete without validating against the spec.
- NEVER skip validation stepsthoroughness is critical for completion.
- ALWAYS provide a comprehensive completion reportthis is the user's confirmation that the work is done.
- If any spec requirements are unmet, clearly flag them and suggest running `/build` again.
- If the user insists on completing despite unmet requirements, ask for explicit confirmation.
- Keep the report professional and structuredthis may be saved for future reference.
- Celebrate the completionacknowledge the successful workflow execution.
- If deviations were logged, ensure they're included in the report for transparency.
- DO NOT suggest running `/complete` again unless there's a valid reason (e.g., unmet requirements).

Context: {$ARGUMENTS}
