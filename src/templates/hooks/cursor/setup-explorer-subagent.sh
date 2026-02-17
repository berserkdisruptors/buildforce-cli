#!/bin/bash

# preToolUse hook: Redirect explore sub-agent to buildforce-explorer
# Uses updated_input to silently swap the subagent_type so the call
# goes through the context repository instead of raw codebase exploration.

INPUT=$(cat)

SUBAGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // empty')

if [ "$SUBAGENT_TYPE" = "explore" ]; then
  ORIGINAL_PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // empty')

  jq -n \
    --arg prompt "$ORIGINAL_PROMPT" \
    '{
      "decision": "allow",
      "updated_input": {
        "subagent_type": "buildforce-explorer",
        "prompt": $prompt
      }
    }'
fi

exit 0
