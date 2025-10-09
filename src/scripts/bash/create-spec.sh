#!/usr/bin/env bash

set -e

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

JSON_MODE=false
ARGS=()
for arg in "$@"; do
    case "$arg" in
        --json) JSON_MODE=true ;;
        --help|-h) echo "Usage: $0 [--json] <user_intent>"; exit 0 ;;
        *) ARGS+=("$arg") ;;
    esac
done

USER_INTENT="${ARGS[*]}"
if [ -z "$USER_INTENT" ]; then
    echo "Usage: $0 [--json] <user_intent>" >&2
    exit 1
fi

# Normalize text for fuzzy matching (lowercase, alphanumeric only)
normalize_text() {
    echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/ /g' | sed 's/  */ /g' | sed 's/^ //' | sed 's/ $//'
}

# Check if two descriptions match closely (fuzzy match)
# Returns 0 (true) if they match, 1 (false) otherwise
fuzzy_match() {
    local desc1=$(normalize_text "$1")
    local desc2=$(normalize_text "$2")

    # Extract significant words (3+ characters) from both descriptions
    local words1=$(echo "$desc1" | tr ' ' '\n' | grep -E '^.{3,}$' || true)
    local words2=$(echo "$desc2" | tr ' ' '\n' | grep -E '^.{3,}$' || true)

    # Count matching words
    local matches=0
    local total=0
    for word in $words2; do
        total=$((total + 1))
        if echo "$words1" | grep -q "$word"; then
            matches=$((matches + 1))
        fi
    done

    # If at least 60% of significant words match, consider it a match
    if [ $total -gt 0 ]; then
        local threshold=$((total * 6 / 10))  # 60% threshold
        if [ $matches -ge $threshold ] && [ $matches -ge 2 ]; then
            return 0  # Match found
        fi
    fi

    return 1  # No match
}

# Get repository root using common function
REPO_ROOT=$(get_repo_root) || exit 1

cd "$REPO_ROOT"

SPECS_DIR="$REPO_ROOT/.buildforce/specs"
mkdir -p "$SPECS_DIR"

# Check for session-tracked current spec from state file (Priority 1)
CURRENT_SPEC_FROM_FILE=$(get_current_spec "$REPO_ROOT")

# Check for existing spec folders that match the user intent
EXISTING_FOLDER=""
HIGHEST=0

if [[ -n "$CURRENT_SPEC_FROM_FILE" ]] && [[ -d "$SPECS_DIR/$CURRENT_SPEC_FROM_FILE" ]]; then
    # Found active spec from state file - use it (highest priority)
    EXISTING_FOLDER="$CURRENT_SPEC_FROM_FILE"
elif [ -d "$SPECS_DIR" ]; then
    # No active spec in state file, do fuzzy matching (Priority 2)
    for dir in "$SPECS_DIR"/*; do
        [ -d "$dir" ] || continue
        dirname=$(basename "$dir")

        # Track highest number for potential new spec
        number=$(echo "$dirname" | grep -o '^[0-9]\+' || echo "0")
        number=$((10#$number))
        if [ "$number" -gt "$HIGHEST" ]; then HIGHEST=$number; fi

        # Extract feature name from folder (remove number prefix)
        feature_name=$(echo "$dirname" | sed 's/^[0-9]\{3\}-//')

        # Fuzzy match against user intent
        if fuzzy_match "$feature_name" "$USER_INTENT"; then
            EXISTING_FOLDER="$dirname"
            break  # Use first match found
        fi
    done
fi

# Determine if this is an update or create operation
IS_UPDATE=false
if [ -n "$EXISTING_FOLDER" ]; then
    # Existing spec found - return it
    IS_UPDATE=true
    FOLDER_NAME="$EXISTING_FOLDER"
    FEATURE_NUM=$(echo "$FOLDER_NAME" | grep -o '^[0-9]\+')
    FEATURE_DIR="$SPECS_DIR/$FOLDER_NAME"
    SPEC_FILE="$FEATURE_DIR/spec.yaml"
else
    # No existing spec - create new
    NEXT=$((HIGHEST + 1))
    FEATURE_NUM=$(printf "%03d" "$NEXT")

    # Normalize user intent and filter stopwords for better folder naming
    FOLDER_NAME=$(echo "$USER_INTENT" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//' | sed 's/-$//')

    # Stopwords to filter (common filler words that don't add semantic value)
    STOPWORDS="^(a|an|the|i|want|to|build|create|add|implement|make|write|develop|need|should|would|like|and|or|for|with|of|in|on|at|from|by|is|are|be|this|that|it|we|you)$"

    # Filter stopwords and take first 3 meaningful words
    WORDS=$(echo "$FOLDER_NAME" | tr '-' '\n' | grep -v '^$' | grep -viE "$STOPWORDS" | head -3 | tr '\n' '-' | sed 's/-$//')

    # Fallback: if no meaningful words remain, use original first 3 words
    if [ -z "$WORDS" ]; then
        WORDS=$(echo "$FOLDER_NAME" | tr '-' '\n' | grep -v '^$' | head -3 | tr '\n' '-' | sed 's/-$//')
    fi

    FOLDER_NAME="${FEATURE_NUM}-${WORDS}"

    FEATURE_DIR="$SPECS_DIR/$FOLDER_NAME"
    mkdir -p "$FEATURE_DIR"

    TEMPLATE="$REPO_ROOT/src/templates/spec-template.yaml"
    SPEC_FILE="$FEATURE_DIR/spec.yaml"
    if [ -f "$TEMPLATE" ]; then cp "$TEMPLATE" "$SPEC_FILE"; else touch "$SPEC_FILE"; fi
fi

# Update state file to track current spec across sessions
set_current_spec "$REPO_ROOT" "$FOLDER_NAME"

# Set CURRENT_SPEC environment variable for session tracking
export CURRENT_SPEC="$FOLDER_NAME"

if $JSON_MODE; then
    printf '{"FOLDER_NAME":"%s","SPEC_FILE":"%s","SPEC_DIR":"%s","FEATURE_NUM":"%s","IS_UPDATE":%s}\n' \
        "$FOLDER_NAME" "$SPEC_FILE" "$FEATURE_DIR" "$FEATURE_NUM" "$($IS_UPDATE && echo 'true' || echo 'false')"
else
    echo "FOLDER_NAME: $FOLDER_NAME"
    echo "SPEC_FILE: $SPEC_FILE"
    echo "SPEC_DIR: $FEATURE_DIR"
    echo "FEATURE_NUM: $FEATURE_NUM"
    echo "IS_UPDATE: $($IS_UPDATE && echo 'true' || echo 'false')"
    echo "CURRENT_SPEC environment variable set to: $FOLDER_NAME"
fi
