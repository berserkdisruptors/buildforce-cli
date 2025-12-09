#!/usr/bin/env bash
# Common functions and variables for all scripts

# Get buildforce root by checking for .buildforce directory in current working directory
# This enables monorepo support and prevents path confusion
get_buildforce_root() {
    local current_dir="$PWD"

    # Check if .buildforce exists in current working directory
    if [ -d "$current_dir/.buildforce" ]; then
        echo "$current_dir"
        return 0
    fi

    # Not found - provide clear error message
    cat >&2 << 'EOF'
ERROR: .buildforce directory not found in current directory.

This command must be run from the directory where you initialized buildforce.

Solutions:
  1. Change to your buildforce root directory:
     cd /path/to/your/buildforce/project

  2. Or initialize a new buildforce project here:
     buildforce init .

Tip: Look for the directory containing .buildforce/ folder.
EOF
    return 1
}


# Set current session in buildforce.json
set_current_session() {
    local json_file="$1/.buildforce/buildforce.json"
    local session_value="$2"
    local temp_file="${json_file}.tmp"

    # Read existing JSON if file exists
    if [[ -f "$json_file" ]]; then
        local existing_content=$(cat "$json_file" 2>/dev/null || echo "{}")

        # Check if currentSession field already exists
        if echo "$existing_content" | grep -q '"currentSession"'; then
            # Replace existing currentSession value
            local json_content=$(echo "$existing_content" | sed 's/"currentSession"[[:space:]]*:[[:space:]]*"[^"]*"/"currentSession":"'"$session_value"'"/' | sed 's/"currentSession"[[:space:]]*:[[:space:]]*null/"currentSession":"'"$session_value"'"/')
        else
            # Add currentSession field before closing brace
            local json_content=$(echo "$existing_content" | sed 's/}$/,"currentSession":"'"$session_value"'"}/' | sed 's/{,/{/')
        fi
    else
        # Create new JSON with currentSession only
        local json_content="{\"currentSession\":\"${session_value}\"}"
    fi

    # Atomic write: write to temp file first, then move
    echo "$json_content" > "$temp_file"
    mv "$temp_file" "$json_file"
}



