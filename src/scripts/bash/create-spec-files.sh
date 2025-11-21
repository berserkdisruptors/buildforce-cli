#!/usr/bin/env bash
# Create a new spec folder with spec.yaml and plan.yaml files for /buildforce.plan command

set -e

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

JSON_MODE=false
FOLDER_NAME=""

# Parse arguments
for arg in "$@"; do
    case "$arg" in
        --json) JSON_MODE=true ;;
        --help|-h) echo "Usage: $0 [--json] --folder-name <semantic-slug-timestamp>"; exit 0 ;;
        --folder-name)
            shift
            FOLDER_NAME="$1"
            shift
            ;;
        *)
            # Check if this is the value for --folder-name
            if [ -z "$FOLDER_NAME" ] && [ "${prev_arg}" = "--folder-name" ]; then
                FOLDER_NAME="$arg"
            fi
            ;;
    esac
    prev_arg="$arg"
done

# Validate --folder-name is provided
if [ -z "$FOLDER_NAME" ]; then
    echo "Error: --folder-name parameter is required" >&2
    echo "Usage: $0 [--json] --folder-name <semantic-slug-timestamp>" >&2
    echo "Example: $0 --folder-name add-auth-jwt-20250122143052" >&2
    exit 1
fi

# Validate folder name format: semantic slug (starting with letter) followed by timestamp
# Pattern: ^[a-z][a-z0-9-]*-[0-9]{14}$
if ! [[ "$FOLDER_NAME" =~ ^[a-z][a-z0-9-]*-[0-9]{14}$ ]]; then
    echo "Error: Folder name must follow format: {semantic-slug}-{timestamp}" >&2
    echo "  - Semantic slug must start with a lowercase letter" >&2
    echo "  - Slug can contain lowercase letters, numbers, and hyphens" >&2
    echo "  - Timestamp must be 14 digits (YYYYMMDDHHmmss)" >&2
    echo "  - Example: add-auth-jwt-20250122143052" >&2
    echo "Provided: $FOLDER_NAME" >&2
    exit 1
fi

# Validate total length (≤50 characters)
if [ "${#FOLDER_NAME}" -gt 50 ]; then
    echo "Error: Folder name must not exceed 50 characters (current: ${#FOLDER_NAME})" >&2
    echo "Provided: $FOLDER_NAME" >&2
    exit 1
fi

# Get buildforce root using common function
BUILDFORCE_ROOT=$(get_buildforce_root) || exit 1

cd "$BUILDFORCE_ROOT"

SPECS_DIR=".buildforce/specs"
TEMPLATES_DIR=".buildforce/templates"
mkdir -p "$SPECS_DIR"

# Create new spec folder
FEATURE_DIR="$SPECS_DIR/$FOLDER_NAME"

# Check if folder already exists
if [ -d "$FEATURE_DIR" ]; then
    echo "Error: Spec folder already exists: $FOLDER_NAME" >&2
    echo "This timestamp may have been used already. Please retry to generate a new timestamp." >&2
    exit 1
fi

mkdir -p "$FEATURE_DIR"

# Copy spec template
SPEC_TEMPLATE="$TEMPLATES_DIR/spec-template.yaml"
SPEC_FILE="$FEATURE_DIR/spec.yaml"
if [ -f "$SPEC_TEMPLATE" ]; then
    cp "$SPEC_TEMPLATE" "$SPEC_FILE"
else
    touch "$SPEC_FILE"
fi

# Copy plan template
PLAN_FILE="$FEATURE_DIR/plan.yaml"
PLAN_TEMPLATE="$TEMPLATES_DIR/plan-template.yaml"
if [ -f "$PLAN_TEMPLATE" ]; then
    cp "$PLAN_TEMPLATE" "$PLAN_FILE"
else
    touch "$PLAN_FILE"
fi

# Update state file to track current spec across sessions
set_current_spec "$BUILDFORCE_ROOT" "$FOLDER_NAME"

# Set CURRENT_SPEC environment variable for session tracking
export CURRENT_SPEC="$FOLDER_NAME"

if $JSON_MODE; then
    printf '{"FOLDER_NAME":"%s","SPEC_FILE":"%s","PLAN_FILE":"%s","SPEC_DIR":"%s"}\n' \
        "$FOLDER_NAME" "$SPEC_FILE" "$PLAN_FILE" "$FEATURE_DIR"
else
    echo "FOLDER_NAME: $FOLDER_NAME"
    echo "SPEC_FILE: $SPEC_FILE"
    echo "PLAN_FILE: $PLAN_FILE"
    echo "SPEC_DIR: $FEATURE_DIR"
    echo "CURRENT_SPEC environment variable set to: $FOLDER_NAME"
fi
