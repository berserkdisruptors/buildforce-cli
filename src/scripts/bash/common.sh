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
     buildforce init --here

Tip: Look for the directory containing .buildforce/ folder.
EOF
    return 1
}

# Get current spec from state file
get_current_spec() {
    local state_file="$1/.buildforce/.current-spec"
    if [[ -f "$state_file" ]]; then
        cat "$state_file"
    fi
}

# Set current spec in state file
set_current_spec() {
    local state_file="$1/.buildforce/.current-spec"
    echo "$2" > "$state_file"
}

get_spec_paths() {
    local buildforce_root=$(get_buildforce_root) || return 1
    local spec_folder=$(get_current_spec "$buildforce_root")
    local spec_dir=""

    if [ -n "$spec_folder" ]; then
        spec_dir="$buildforce_root/.buildforce/specs/$spec_folder"
    fi

    cat <<EOF
BUILDFORCE_ROOT='$buildforce_root'
SPEC_DIR='$spec_dir'
EOF
}

check_file() { [[ -f "$1" ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
check_dir() { [[ -d "$1" && -n $(ls -A "$1" 2>/dev/null) ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
