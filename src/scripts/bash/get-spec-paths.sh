#!/usr/bin/env bash

# This script gets the current spec and returns the paths to the spec files and directories.
#
# Usage: ./get-spec-paths.sh [OPTIONS]
#
# OPTIONS:
#   --json              Output in JSON format
#   --paths-only        Only output path variables (no validation)
#   --help, -h          Show help message
#
# OUTPUTS:
#   JSON mode: {"SPEC_DIR":"..."}
#   Text mode: SPEC_DIR:... \n 
#   Paths only: REPO_ROOT: ... \n SPEC_DIR: ... etc.

set -e

# Parse command line arguments
JSON_MODE=false
PATHS_ONLY=false

for arg in "$@"; do
    case "$arg" in
        --json)
            JSON_MODE=true
            ;;
        --paths-only)
            PATHS_ONLY=true
            ;;
        --help|-h)
            cat << 'EOF'
Usage: get-spec-paths.sh [OPTIONS]

Get the current spec and return the paths to the spec files and directories.

OPTIONS:
  --json              Output in JSON format
  --paths-only        Only output path variables (no validation)
  --help, -h          Show this help message

EXAMPLES:
  # Get spec paths
  ./get-spec-paths.sh --json
  
  # Get spec paths only (no validation)
  ./get-spec-paths.sh --paths-only
  
EOF
            exit 0
            ;;
        *)
            echo "ERROR: Unknown option '$arg'. Use --help for usage information." >&2
            exit 1
            ;;
    esac
done

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Get spec paths
eval $(get_spec_paths)

# If paths-only mode, output paths and exit (support JSON + paths-only combined)
if $PATHS_ONLY; then
    if $JSON_MODE; then
        # Minimal JSON paths payload (no validation performed)
        printf '{"BUILDFORCE_ROOT":"%s","SPEC_DIR":"%s"}\n' \
            "$BUILDFORCE_ROOT" "$SPEC_DIR"
    else
        echo "BUILDFORCE_ROOT: $BUILDFORCE_ROOT"
        echo "SPEC_DIR: $SPEC_DIR"
    fi
    exit 0
fi

# Validate required directories and files
if [[ ! -d "$SPEC_DIR" ]]; then
    echo "ERROR: Spec directory not found: $SPEC_DIR" >&2
    echo "Run /spec first to create the spec folder." >&2
    exit 1
fi


# Output results
if $JSON_MODE; then
    # Build JSON array of documents
    if [[ ${#docs[@]} -eq 0 ]]; then
        json_docs="[]"
    else
        json_docs=$(printf '"%s",' "${docs[@]}")
        json_docs="[${json_docs%,}]"
    fi

    printf '{"BUILDFORCE_ROOT":"%s","SPEC_DIR":"%s"}\n' "$BUILDFORCE_ROOT" "$SPEC_DIR"
else
    # Text output
    echo "BUILDFORCE_ROOT:$BUILDFORCE_ROOT"
    echo "SPEC_DIR:$SPEC_DIR"

fi