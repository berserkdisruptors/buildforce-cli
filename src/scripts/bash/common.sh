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

# Get current spec from buildforce.json
get_current_spec() {
    local json_file="$1/.buildforce/buildforce.json"

    # Return empty if file doesn't exist
    if [[ ! -f "$json_file" ]]; then
        return 0
    fi

    # Parse currentSpec field from JSON
    # This uses native bash instead of requiring jq
    local content=$(cat "$json_file" 2>/dev/null || echo "")

    # Extract currentSpec value (handles null and string values)
    local spec=$(echo "$content" | grep -o '"currentSpec"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"currentSpec"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

    # Return the spec value (empty if null or not found)
    if [[ -n "$spec" ]]; then
        echo "$spec"
    fi
}

# Set current spec in buildforce.json
set_current_spec() {
    local json_file="$1/.buildforce/buildforce.json"
    local spec_value="$2"
    local temp_file="${json_file}.tmp"

    # Read existing JSON if file exists
    if [[ -f "$json_file" ]]; then
        local existing_content=$(cat "$json_file" 2>/dev/null || echo "{}")

        # Check if currentSpec field already exists
        if echo "$existing_content" | grep -q '"currentSpec"'; then
            # Replace existing currentSpec value
            local json_content=$(echo "$existing_content" | sed 's/"currentSpec"[[:space:]]*:[[:space:]]*"[^"]*"/"currentSpec":"'"$spec_value"'"/' | sed 's/"currentSpec"[[:space:]]*:[[:space:]]*null/"currentSpec":"'"$spec_value"'"/')
        else
            # Add currentSpec field before closing brace
            local json_content=$(echo "$existing_content" | sed 's/}$/,"currentSpec":"'"$spec_value"'"}/' | sed 's/{,/{/')
        fi
    else
        # Create new JSON with currentSpec only
        local json_content="{\"currentSpec\":\"${spec_value}\"}"
    fi

    # Atomic write: write to temp file first, then move
    echo "$json_content" > "$temp_file"
    mv "$temp_file" "$json_file"
}

# Clear current spec in buildforce.json (set to null)
clear_current_spec() {
    local json_file="$1/.buildforce/buildforce.json"
    local temp_file="${json_file}.tmp"

    # Read existing JSON if file exists
    if [[ -f "$json_file" ]]; then
        local existing_content=$(cat "$json_file" 2>/dev/null || echo "{}")

        # Check if currentSpec field already exists
        if echo "$existing_content" | grep -q '"currentSpec"'; then
            # Replace existing currentSpec value with null
            local json_content=$(echo "$existing_content" | sed 's/"currentSpec"[[:space:]]*:[[:space:]]*"[^"]*"/"currentSpec":null/' | sed 's/"currentSpec"[[:space:]]*:[[:space:]]*null/"currentSpec":null/')
        else
            # Add currentSpec field as null before closing brace
            local json_content=$(echo "$existing_content" | sed 's/}$/,"currentSpec":null}/' | sed 's/{,/{/')
        fi
    else
        # Create new JSON with currentSpec null
        local json_content="{\"currentSpec\":null}"
    fi

    # Atomic write: write to temp file first, then move
    echo "$json_content" > "$temp_file"
    mv "$temp_file" "$json_file"
}

get_spec_paths() {
    local buildforce_root=$(get_buildforce_root) || return 1
    local spec_folder=$(get_current_spec "$buildforce_root")
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
