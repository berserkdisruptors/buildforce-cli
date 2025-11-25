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

# Get current session from buildforce.json
get_current_session() {
    local json_file="$1/.buildforce/buildforce.json"

    # Return empty if file doesn't exist
    if [[ ! -f "$json_file" ]]; then
        return 0
    fi

    # Parse currentSession field from JSON
    # This uses native bash instead of requiring jq
    local content=$(cat "$json_file" 2>/dev/null || echo "")

    # Extract currentSession value (handles null and string values)
    local session=$(echo "$content" | grep -o '"currentSession"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"currentSession"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

    # Return the session value (empty if null or not found)
    if [[ -n "$session" ]]; then
        echo "$session"
    fi
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

# Clear current session in buildforce.json (set to null)
clear_current_session() {
    local json_file="$1/.buildforce/buildforce.json"
    local temp_file="${json_file}.tmp"

    # Read existing JSON if file exists
    if [[ -f "$json_file" ]]; then
        local existing_content=$(cat "$json_file" 2>/dev/null || echo "{}")

        # Check if currentSession field already exists
        if echo "$existing_content" | grep -q '"currentSession"'; then
            # Replace existing currentSession value with null
            local json_content=$(echo "$existing_content" | sed 's/"currentSession"[[:space:]]*:[[:space:]]*"[^"]*"/"currentSession":null/' | sed 's/"currentSession"[[:space:]]*:[[:space:]]*null/"currentSession":null/')
        else
            # Add currentSession field as null before closing brace
            local json_content=$(echo "$existing_content" | sed 's/}$/,"currentSession":null}/' | sed 's/{,/{/')
        fi
    else
        # Create new JSON with currentSession null
        local json_content="{\"currentSession\":null}"
    fi

    # Atomic write: write to temp file first, then move
    echo "$json_content" > "$temp_file"
    mv "$temp_file" "$json_file"
}

get_spec_paths() {
    local buildforce_root=$(get_buildforce_root) || return 1
    local spec_folder=$(get_current_session "$buildforce_root")
    local spec_dir=""

    if [ -n "$spec_folder" ]; then
        spec_dir="$buildforce_root/.buildforce/sessions/$spec_folder"
    fi

    cat <<EOF
BUILDFORCE_ROOT='$buildforce_root'
SPEC_DIR='$spec_dir'
EOF
}

check_file() { [[ -f "$1" ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
check_dir() { [[ -d "$1" && -n $(ls -A "$1" 2>/dev/null) ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
