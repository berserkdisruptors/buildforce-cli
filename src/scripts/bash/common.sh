#!/usr/bin/env bash
# Common functions and variables for all scripts

# Find repository root by searching for project markers (.git or .buildforce)
find_repo_root() {
    local dir="$1"
    while [ "$dir" != "/" ]; do
        if [ -d "$dir/.git" ] || [ -d "$dir/.buildforce" ]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

# Get repository root, with fallback for non-git repositories
# Prefers git, then searches for project markers (.git or .buildforce)
get_repo_root() {
    if git rev-parse --show-toplevel >/dev/null 2>&1; then
        git rev-parse --show-toplevel
    else
        # Get script directory to start the search
        local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        local repo_root="$(find_repo_root "$script_dir")"

        if [ -z "$repo_root" ]; then
            echo "Error: Could not determine repository root. Please run this script from within the repository." >&2
            return 1
        fi

        echo "$repo_root"
    fi
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
    local repo_root=$(get_repo_root)
    local spec_dir=$(get_current_spec "$repo_root")

    cat <<EOF
REPO_ROOT='$repo_root'
SPEC_DIR='$spec_dir'
EOF
}

check_file() { [[ -f "$1" ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
check_dir() { [[ -d "$1" && -n $(ls -A "$1" 2>/dev/null) ]] && echo "  ✓ $2" || echo "  ✗ $2"; }
