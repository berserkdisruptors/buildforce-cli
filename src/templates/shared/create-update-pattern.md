# Create vs Update Mode - Priority System

This pattern is used by commands that need to determine whether to create a new artifact or update an existing one.

## Priority System

**PRIORITY 1 - Check conversation history (highest priority):**
- If the artifact was created or updated earlier in THIS conversation, use that path directly
- Skip script execution entirely - you already know the artifact location
- Set `IS_UPDATE = true` and use the conversation-tracked path
- Go directly to UPDATE mode
- **This ensures that running the command multiple times in the same session always updates the same artifact**

**PRIORITY 2 - Run script (if no conversation history):**
- Execute the command's script (e.g., `create-spec.sh`, `create-plan.sh`)
- Parse JSON output for artifact paths and **IS_UPDATE** flag
- The script implements its own priority system:
  1. Checks state file (e.g., `.buildforce/.current-spec`) for active artifact
  2. Falls back to fuzzy matching if no state file exists
  3. Returns `IS_UPDATE: true` if existing artifact found, `false` for new artifact

## Handling the IS_UPDATE Flag

After determining the mode (Priority 1 or Priority 2), proceed based on the flag:

### IS_UPDATE = false → CREATE Mode
- Load the appropriate template file
- Create a new artifact from scratch
- Populate all fields based on user input
- Never leave placeholders in the final artifact
- Write to the path provided by the script

### IS_UPDATE = true → UPDATE Mode
- Read the existing artifact file to understand what's already defined
- **Preserve existing values** - DO NOT overwrite with placeholders
- Update the `last_updated` field (if applicable)
- Intelligently merge new information from user input:
  * Adding items → append to relevant lists/sections
  * Changing scope → update relevant sections
  * Clarifying ambiguities → remove from open questions, add to relevant sections
  * Adding context → append to notes or update relevant sections
- **Report what changed**: Clearly state which sections were updated and what was added/modified

## Implementation Notes

1. **Script execution**: Only run the script ONCE per command invocation
2. **Conversation tracking**: Always check if you've already created/updated an artifact in this conversation before running any script
3. **State file management**: Scripts handle `.buildforce/.current-*` state files for session persistence
4. **Fuzzy matching**: Scripts use 60% threshold for matching descriptions to existing artifacts
5. **Transparency**: Always inform the user which mode was used and why

## Script JSON Output Format

Scripts should return JSON with these fields:
```json
{
  "ARTIFACT_PATH": "/absolute/path/to/artifact",
  "ARTIFACT_DIR": "/absolute/path/to/directory",
  "ARTIFACT_NUM": "NNN",
  "ARTIFACT_NAME": "artifact-folder-name",
  "IS_UPDATE": true|false
}
```

Field names will vary by command (e.g., `SPEC_FILE` for spec, `PLAN_FILE` for plan), but the pattern remains consistent.
