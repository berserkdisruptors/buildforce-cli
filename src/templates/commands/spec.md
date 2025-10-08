---
description: Materialize user intent into a structured specification document that captures WHAT needs to be changed.
---

The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

$ARGUMENTS

The text the user typed after `/spec` in the triggering message **is** the user's intentthe concrete incremental change they want to implement. Assume you always have it available in this conversation. Do not ask the user to repeat it unless they provided an empty command.

Goal: Transform the user's intent into a clear, complete, unambiguous specification that captures WHAT needs to be built or changed, avoiding premature decisions about HOW to implement it.

Execution steps:

1. **Intent Analysis**: Parse the user's intent ($ARGUMENTS) to understand:
   - The **core change** being requested (new feature, bug fix, refactor, enhancement)
   - The **scope** of the change (which parts of the system are affected)
   - The **user's motivation** or problem being solved
   - Any **constraints** or **requirements** explicitly mentioned
   - Any **context** gathered from prior `/research` commands in this conversation

2. **Validate Prerequisite Context**:
   - Check if sufficient context exists from previous research or conversation history.
   - If critical information is missing (e.g., "how does authentication currently work?"), suggest running `/research` first.
   - If the intent is too vague or ambiguous, ask up to 3 targeted clarifying questions before proceeding.

3. **Generate Specification Structure**: Create a specification document with the following sections:

   ## Overview
   - Brief description of the change (1-3 sentences)
   - Problem statement or motivation
   - Expected outcome or success criteria

   ## Scope
   - **In Scope**: What will be changed/added/removed
   - **Out of Scope**: What will NOT be changed (important for preventing scope creep)

   ## Functional Requirements
   - Numbered list of WHAT the system must do
   - Use clear, testable language (avoid vague terms like "robust" or "intuitive")
   - Each requirement should be independently verifiable

   ## Non-Functional Requirements (if applicable)
   - Performance expectations
   - Security considerations
   - Scalability needs
   - Compatibility constraints
   - Accessibility requirements

   ## User Stories / Use Cases (if applicable)
   - As a [user type], I want to [action], so that [benefit]
   - Include acceptance criteria for each story

   ## Data Model Changes (if applicable)
   - New entities, attributes, or relationships
   - Changes to existing data structures
   - Migration considerations

   ## Edge Cases & Error Handling
   - Negative scenarios
   - Boundary conditions
   - Failure modes and expected behavior

   ## Assumptions & Dependencies
   - What we assume to be true
   - External dependencies (libraries, services, APIs)
   - Prerequisites that must exist

   ## Open Questions (if any)
   - Items that need clarification or decision
   - Tradeoffs that need user input
   - Areas where multiple approaches are possible

4. **Validate Specification Completeness**:
   - Ensure all sections have meaningful content (no placeholders or TODOs unless flagged as Open Questions).
   - Check for internal consistency (no contradictions).
   - Verify all requirements are testable and measurable.
   - Confirm the spec captures WHAT, not HOW (avoid implementation details like "use library X" unless it's a constraint).

5. **Present Specification to User**:
   - Display the complete specification document.
   - Highlight any Open Questions that need user input.
   - Ask: "Does this specification accurately capture your intent? Are there any gaps, misunderstandings, or areas that need refinement?"

6. **Iterate if Needed**:
   - If the user requests changes, update the specification accordingly.
   - Track iterations to ensure convergence (avoid infinite loops).
   - Once the user confirms the spec is complete, proceed to the next step.

7. **Save Specification** (optional for future persistence):
   - If the workflow includes saving artifacts, store the spec in a designated location (e.g., `.buildforce/specs/feature-name.md`).
   - Provide the file path to the user for reference.

8. **Suggest Next Steps**:
   - If the spec is complete and approved, suggest: "Ready to create a plan? Run `/plan` to design the implementation approach."
   - If Open Questions remain, suggest resolving them before planning.

Behavior rules:
- NEVER rush into implementation detailsthis is WHAT, not HOW.
- NEVER assume requirementsif unclear, ask clarifying questions.
- NEVER leave placeholders or TODOs in the spec without flagging them as Open Questions.
- ALWAYS ensure requirements are testable and measurable.
- ALWAYS check for contradictions or ambiguities before presenting the spec.
- If the user provides additional context during iteration, integrate it seamlessly into the spec.
- Keep the spec concise but completeavoid unnecessary verbosity.
- Focus on **incremental changes**the spec should describe a single, focused change, not a complete system rewrite.

Context: {$ARGUMENTS}
