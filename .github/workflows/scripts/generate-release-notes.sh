#!/usr/bin/env bash
set -euo pipefail

# generate-release-notes.sh
# Generate release notes from git history with categorized commits
# Usage: generate-release-notes.sh <new_version> <last_tag>

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <new_version> <last_tag>" >&2
  exit 1
fi

NEW_VERSION="$1"
LAST_TAG="$2"

# Get commits since last tag, excluding [skip ci] commits
if [ "$LAST_TAG" = "v0.0.0" ]; then
  # Check how many commits we have and use that as the limit
  COMMIT_COUNT=$(git rev-list --count HEAD)
  if [ "$COMMIT_COUNT" -gt 10 ]; then
    COMMITS=$(git log --oneline --pretty=format:"%s" HEAD~10..HEAD | grep -v "\[skip ci\]" || true)
  else
    COMMITS=$(git log --oneline --pretty=format:"%s" HEAD~$COMMIT_COUNT..HEAD 2>/dev/null | grep -v "\[skip ci\]" || git log --oneline --pretty=format:"%s" | grep -v "\[skip ci\]" || true)
  fi
else
  COMMITS=$(git log --oneline --pretty=format:"%s" $LAST_TAG..HEAD | grep -v "\[skip ci\]" || true)
fi

# Create release notes header
cat > release_notes.md << 'EOF'
Template packages for all supported AI assistants. **Recommended:** Install via `npm install -g @buildforce/cli` and run `buildforce init`.

EOF

# Add categorized commits if any exist
if [ -n "$COMMITS" ]; then
  echo "## What's Changed" >> release_notes.md
  echo "" >> release_notes.md

  # Define categories with emojis
  declare -A CATEGORIES=(
    ["feat"]="✨ Features"
    ["fix"]="🐛 Bug Fixes"
    ["docs"]="📝 Documentation"
    ["refactor"]="♻️ Refactoring"
    ["test"]="✅ Tests"
    ["perf"]="⚡ Performance"
    ["style"]="💄 Styling"
    ["build"]="🏗️ Build System"
    ["ci"]="👷 CI/CD"
    ["chore"]="🔧 Chores"
  )

  # Process each category
  for type in feat fix docs refactor test perf style build ci chore; do
    CATEGORY_COMMITS=$(echo "$COMMITS" | grep "^${type}:" || true)
    if [ -n "$CATEGORY_COMMITS" ]; then
      echo "### ${CATEGORIES[$type]}" >> release_notes.md
      echo "$CATEGORY_COMMITS" | sed 's/^/- /' >> release_notes.md
      echo "" >> release_notes.md
    fi
  done

  # Add uncategorized commits (Other)
  OTHER_COMMITS=$(echo "$COMMITS" | grep -v "^\(feat\|fix\|docs\|refactor\|test\|perf\|style\|build\|ci\|chore\):" || true)
  if [ -n "$OTHER_COMMITS" ]; then
    echo "### Other" >> release_notes.md
    echo "$OTHER_COMMITS" | sed 's/^/- /' >> release_notes.md
    echo "" >> release_notes.md
  fi
else
  echo "No changes in this release (all commits filtered or no commits found)." >> release_notes.md
fi

echo "Generated release notes:"
cat release_notes.md