#!/bin/bash

# update-template-versions.sh
# Updates version field in all template files with YAML frontmatter
# Usage: update-template-versions.sh <version>
# Example: update-template-versions.sh 0.1.0

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validate version argument
if [ $# -ne 1 ]; then
    echo -e "${RED}Error: Version argument required${NC}"
    echo "Usage: $0 <version>"
    echo "Example: $0 0.1.0"
    exit 1
fi

VERSION="$1"

# Validate semantic version format (without 'v' prefix)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: Invalid version format. Expected semver without 'v' prefix (e.g., 0.1.0)${NC}"
    exit 1
fi

echo -e "${GREEN}Updating template versions to: ${VERSION}${NC}"

# Find templates directory
TEMPLATES_DIR="src/templates"

if [ ! -d "$TEMPLATES_DIR" ]; then
    echo -e "${RED}Error: Templates directory not found: $TEMPLATES_DIR${NC}"
    exit 1
fi

# Counter for tracking updates
UPDATED_COUNT=0
SKIPPED_COUNT=0
TOTAL_FILES=0

# Function to check if file has YAML frontmatter (markdown files with ---)
has_yaml_frontmatter() {
    local file="$1"
    # Check if file starts with --- (YAML frontmatter delimiter)
    head -n 1 "$file" 2>/dev/null | grep -q "^---$"
}

# Function to check if file is a pure YAML file (.yaml or .yml extension)
is_pure_yaml() {
    local file="$1"
    [[ "$file" =~ \.(yaml|yml)$ ]]
}

# Function to check if version already matches in pure YAML
version_matches_yaml() {
    local file="$1"
    local current_version

    # Extract version from pure YAML file (check first 20 lines)
    # Handle both with and without quotes, and allow trailing comments
    current_version=$(head -n 20 "$file" | grep -E "^version:" | sed -E 's/^version:[[:space:]]*"?([^"#]+)"?.*$/\1/' | sed 's/[[:space:]]*$//' | head -n 1)

    if [ "$current_version" = "$VERSION" ]; then
        return 0  # Version matches
    else
        return 1  # Version doesn't match or doesn't exist
    fi
}

# Function to check if version already matches in frontmatter
version_matches_frontmatter() {
    local file="$1"
    local current_version

    # Extract current version if it exists in frontmatter
    # Handle both with and without quotes, and allow trailing comments
    current_version=$(sed -n '2,/^---$/p' "$file" | grep -E "^version:" | sed -E 's/^version:[[:space:]]*"?([^"#]+)"?.*$/\1/' | sed 's/[[:space:]]*$//' | head -n 1)

    if [ "$current_version" = "$VERSION" ]; then
        return 0  # Version matches
    else
        return 1  # Version doesn't match or doesn't exist
    fi
}

# Function to update version in pure YAML files (.yaml, .yml)
update_version_yaml() {
    local file="$1"
    local temp_file="${file}.tmp"

    # Check if version already matches (idempotency)
    if version_matches_yaml "$file"; then
        echo -e "  Skipping (version already ${VERSION}): $file"
        ((SKIPPED_COUNT++))
        return
    fi

    # Check if version field already exists
    if grep -q "^version:" "$file"; then
        # Update existing version field (first occurrence only using awk for portability)
        awk -v new_version="$VERSION" '
            /^version:/ && !updated {
                print "version: \"" new_version "\""
                updated=1
                next
            }
            { print }
        ' "$file" > "$temp_file"
    else
        # Insert version as the first line in pure YAML
        echo "version: \"${VERSION}\"" > "$temp_file"
        cat "$file" >> "$temp_file"
    fi

    # Replace original file with updated file
    mv "$temp_file" "$file"

    echo -e "${GREEN}  ✓ Updated: $file${NC}"
    ((UPDATED_COUNT++))
}

# Function to update version in markdown files with YAML frontmatter
update_version_frontmatter() {
    local file="$1"
    local temp_file="${file}.tmp"

    # Check if file has frontmatter
    if ! has_yaml_frontmatter "$file"; then
        echo -e "${YELLOW}  Skipping (no YAML frontmatter): $file${NC}"
        ((SKIPPED_COUNT++))
        return
    fi

    # Check if version already matches (idempotency)
    if version_matches_frontmatter "$file"; then
        echo -e "  Skipping (version already ${VERSION}): $file"
        ((SKIPPED_COUNT++))
        return
    fi

    # Check if version field exists in frontmatter
    if sed -n '2,/^---$/p' "$file" | grep -q "^version:"; then
        # Version field exists - update it
        # Use awk to update only the first occurrence of version: in the frontmatter
        awk '
            BEGIN { in_frontmatter=0; updated=0 }
            NR==1 && /^---$/ { in_frontmatter=1; print; next }
            in_frontmatter && /^---$/ { in_frontmatter=0; print; next }
            in_frontmatter && /^version:/ && !updated {
                print "version: \"'"$VERSION"'\""
                updated=1
                next
            }
            { print }
        ' "$file" > "$temp_file"
    else
        # Version field doesn't exist - insert it after opening ---
        # Insert version as the first field in frontmatter
        awk '
            BEGIN { inserted=0 }
            NR==1 && /^---$/ { print; print "version: \"'"$VERSION"'\""; inserted=1; next }
            { print }
        ' "$file" > "$temp_file"
    fi

    # Replace original file with updated file
    mv "$temp_file" "$file"

    echo -e "${GREEN}  ✓ Updated: $file${NC}"
    ((UPDATED_COUNT++))
}

# Main function to update version - routes to appropriate handler
update_version() {
    local file="$1"

    if is_pure_yaml "$file"; then
        update_version_yaml "$file"
    else
        update_version_frontmatter "$file"
    fi
}

# Find and process all template files (.yaml, .yml, and .md files in templates directory)
echo -e "\nProcessing templates in $TEMPLATES_DIR..."

# Process YAML templates (spec, plan, research)
while IFS= read -r -d '' file; do
    ((TOTAL_FILES++))
    update_version "$file"
done < <(find "$TEMPLATES_DIR" -type f \( -name "*.yaml" -o -name "*.yml" \) -print0) || true

# Process Markdown command templates
while IFS= read -r -d '' file; do
    ((TOTAL_FILES++))
    update_version "$file"
done < <(find "$TEMPLATES_DIR/commands" -type f -name "*.md" -print0 2>/dev/null || true) || true

# Report summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Version Update Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Total files processed: $TOTAL_FILES"
echo -e "${GREEN}Files updated: $UPDATED_COUNT${NC}"
echo -e "Files skipped: $SKIPPED_COUNT"
echo -e "${GREEN}========================================${NC}"

# Exit with success if at least some files were processed
if [ $TOTAL_FILES -eq 0 ]; then
    echo -e "${RED}Error: No template files found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Template version update complete${NC}"
exit 0
