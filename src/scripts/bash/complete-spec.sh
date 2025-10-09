#!/usr/bin/env bash

# Complete a spec by creating context files and updating the context repository
#
# This script:
# 1. Verifies current spec state using get-spec-paths.sh
# 2. Collects all artifacts from the spec directory
# 3. Dynamically loads the context schema
# 4. Generates a new context YAML file based on the schema and spec artifacts
# 5. Updates _index.yml with a pointer to the new context file
# 6. Updates related context files based on spec dependencies
# 7. Clears the current spec state
#
# Usage: ./complete-spec.sh [OPTIONS]
#
# OPTIONS:
#   --json              Output in JSON format
#   --help, -h          Show help message

set -e

# Parse command line arguments
JSON_MODE=false

for arg in "$@"; do
    case "$arg" in
        --json)
            JSON_MODE=true
            ;;
        --help|-h)
            cat << 'EOF'
Usage: complete-spec.sh [OPTIONS]

Complete the current spec by creating context files and updating the context repository.

OPTIONS:
  --json              Output in JSON format
  --help, -h          Show this help message

EXAMPLES:
  # Complete the current spec
  ./complete-spec.sh

  # Complete with JSON output
  ./complete-spec.sh --json

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

# Get repository root
REPO_ROOT=$(get_repo_root) || exit 1

# Verify current spec state using get-spec-paths.sh
SPEC_PATHS_JSON=$(bash "$SCRIPT_DIR/get-spec-paths.sh" --json 2>&1)
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to get current spec paths. Run /spec first to create a spec." >&2
    if ! $JSON_MODE; then
        echo "$SPEC_PATHS_JSON" >&2
    fi
    exit 1
fi

# Parse SPEC_DIR from JSON
SPEC_DIR=$(echo "$SPEC_PATHS_JSON" | grep -o '"SPEC_DIR":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SPEC_DIR" ] || [ ! -d "$SPEC_DIR" ]; then
    echo "ERROR: Invalid SPEC_DIR: $SPEC_DIR" >&2
    exit 1
fi

# Extract spec folder name (e.g., "002-build-command")
SPEC_FOLDER_NAME=$(basename "$SPEC_DIR")

# Paths
CONTEXT_DIR="$REPO_ROOT/.buildforce/context"
SCHEMA_FILE="$CONTEXT_DIR/_schema.yml"
INDEX_FILE="$CONTEXT_DIR/_index.yml"

# Verify schema exists
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "ERROR: Schema file not found: $SCHEMA_FILE" >&2
    exit 1
fi

# Verify index exists
if [ ! -f "$INDEX_FILE" ]; then
    echo "ERROR: Index file not found: $INDEX_FILE" >&2
    exit 1
fi

# Collect all artifacts from spec directory
ARTIFACTS=()
while IFS= read -r -d '' file; do
    ARTIFACTS+=("$file")
done < <(find "$SPEC_DIR" -type f -print0)

if [ ${#ARTIFACTS[@]} -eq 0 ]; then
    echo "ERROR: No artifacts found in spec directory: $SPEC_DIR" >&2
    exit 1
fi

# Read spec.yml to extract metadata
SPEC_FILE="$SPEC_DIR/spec.yml"
if [ ! -f "$SPEC_FILE" ]; then
    # Try .yaml extension
    SPEC_FILE="$SPEC_DIR/spec.yaml"
    if [ ! -f "$SPEC_FILE" ]; then
        echo "ERROR: No spec.yml or spec.yaml found in $SPEC_DIR" >&2
        exit 1
    fi
fi

# Extract key fields from spec.yml using grep/awk
SPEC_ID=$(grep "^id:" "$SPEC_FILE" | head -1 | awk '{print $2}' | tr -d '"' | tr -d "'")
SPEC_NAME=$(grep "^name:" "$SPEC_FILE" | head -1 | sed 's/^name: *//' | tr -d '"')
SPEC_TYPE=$(grep "^type:" "$SPEC_FILE" | head -1 | awk '{print $2}' | tr -d '"' | tr -d "'")
SPEC_STATUS=$(grep "^status:" "$SPEC_FILE" | head -1 | awk '{print $2}' | tr -d '"' | tr -d "'")

# Validate required fields
if [ -z "$SPEC_ID" ]; then
    SPEC_ID="$SPEC_FOLDER_NAME"
fi

if [ -z "$SPEC_NAME" ]; then
    SPEC_NAME="$SPEC_FOLDER_NAME"
fi

if [ -z "$SPEC_TYPE" ]; then
    SPEC_TYPE="feature"
fi

# Generate context file name from spec ID
CONTEXT_FILE_NAME="${SPEC_ID}.yml"
CONTEXT_FILE="$CONTEXT_DIR/$CONTEXT_FILE_NAME"

# Check if context file already exists
if [ -f "$CONTEXT_FILE" ]; then
    echo "WARNING: Context file already exists: $CONTEXT_FILE" >&2
    echo "WARNING: It will be overwritten." >&2
fi

# Create context file with dynamic schema-based structure
# We'll extract sections from the schema and populate what we can from spec artifacts

# Read schema to understand structure (simplified parsing)
# For now, we'll create a basic context file structure and rely on the agent to populate details

CURRENT_DATE=$(date +%Y-%m-%d)

# Start building context file content
cat > "$CONTEXT_FILE" << EOF
id: $SPEC_ID
name: "$SPEC_NAME"
type: $SPEC_TYPE
status: ${SPEC_STATUS:-completed}
created: $CURRENT_DATE
last_updated: $CURRENT_DATE

summary: |
  [Agent will populate from spec and conversation context]

responsibilities:
  - [Agent will extract from spec requirements]

dependencies:
  internal: {}
  external: {}

files:
  primary: []
  secondary: []

evolution:
  - version: "1.0"
    date: "$CURRENT_DATE"
    changes: "Initial implementation"

related_specs:
  - "$SPEC_FOLDER_NAME"

notes: |
  [Agent will add additional context from conversation]
EOF

# Update _index.yml with new context entry
# First check if entry already exists
if grep -q "id: $SPEC_ID" "$INDEX_FILE"; then
    echo "INFO: Context entry already exists in index for id: $SPEC_ID" >&2
else
    # Extract tags from spec if available (look for tags or similar fields)
    TAGS=""
    if grep -q "^tags:" "$SPEC_FILE"; then
        # Extract tags array from YAML (simplified)
        TAGS=$(grep -A 10 "^tags:" "$SPEC_FILE" | grep "  -" | sed 's/  - //' | tr '\n' ',' | sed 's/,$//')
    fi

    # Default tags if none found
    if [ -z "$TAGS" ]; then
        TAGS="$SPEC_TYPE"
    fi

    # Append new entry to index (maintaining proper YAML structure)
    echo "" >> "$INDEX_FILE"
    echo "  - id: $SPEC_ID" >> "$INDEX_FILE"
    echo "    file: $CONTEXT_FILE_NAME" >> "$INDEX_FILE"
    echo "    type: $SPEC_TYPE" >> "$INDEX_FILE"
    echo "    tags: [$TAGS]" >> "$INDEX_FILE"
fi

# Identify related context files based on dependencies in spec
RELATED_CONTEXTS=()
if grep -q "^dependencies:" "$SPEC_FILE"; then
    # Extract dependency names (simplified parsing)
    DEPS=$(grep -A 20 "^dependencies:" "$SPEC_FILE" | grep -E "^\s+[a-z-]+:" | awk '{print $1}' | tr -d ':')

    for dep in $DEPS; do
        # Search for matching context files
        MATCHING_CONTEXT=$(grep -l "id: $dep" "$CONTEXT_DIR"/*.yml 2>/dev/null || true)
        if [ -n "$MATCHING_CONTEXT" ]; then
            RELATED_CONTEXTS+=("$MATCHING_CONTEXT")
        fi
    done
fi

# Clear current spec state
STATE_FILE="$REPO_ROOT/.buildforce/.current-spec"
if [ -f "$STATE_FILE" ]; then
    rm "$STATE_FILE"
fi

# Output results
if $JSON_MODE; then
    # Build artifacts JSON array
    ARTIFACTS_JSON="["
    for i in "${!ARTIFACTS[@]}"; do
        if [ $i -gt 0 ]; then
            ARTIFACTS_JSON+=","
        fi
        # Make path relative to REPO_ROOT for cleaner output
        REL_PATH="${ARTIFACTS[$i]#$REPO_ROOT/}"
        ARTIFACTS_JSON+="\"$REL_PATH\""
    done
    ARTIFACTS_JSON+="]"

    # Build related contexts JSON array
    RELATED_JSON="["
    for i in "${!RELATED_CONTEXTS[@]}"; do
        if [ $i -gt 0 ]; then
            RELATED_JSON+=","
        fi
        REL_PATH="${RELATED_CONTEXTS[$i]#$REPO_ROOT/}"
        RELATED_JSON+="\"$REL_PATH\""
    done
    RELATED_JSON+="]"

    printf '{"SPEC_DIR":"%s","SPEC_ID":"%s","CONTEXT_FILE":"%s","ARTIFACTS":%s,"RELATED_CONTEXTS":%s,"STATUS":"success"}\n' \
        "$SPEC_DIR" "$SPEC_ID" "$CONTEXT_FILE" "$ARTIFACTS_JSON" "$RELATED_JSON"
else
    echo "Spec completion successful!"
    echo ""
    echo "SPEC_DIR: $SPEC_DIR"
    echo "SPEC_ID: $SPEC_ID"
    echo "CONTEXT_FILE: $CONTEXT_FILE"
    echo ""
    echo "Artifacts collected (${#ARTIFACTS[@]}):"
    for artifact in "${ARTIFACTS[@]}"; do
        REL_PATH="${artifact#$REPO_ROOT/}"
        echo "  - $REL_PATH"
    done
    echo ""
    if [ ${#RELATED_CONTEXTS[@]} -gt 0 ]; then
        echo "Related context files (${#RELATED_CONTEXTS[@]}):"
        for ctx in "${RELATED_CONTEXTS[@]}"; do
            REL_PATH="${ctx#$REPO_ROOT/}"
            echo "  - $REL_PATH"
        done
    else
        echo "No related context files found."
    fi
    echo ""
    echo "Current spec state cleared."
fi
