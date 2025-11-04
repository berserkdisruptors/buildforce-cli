#!/usr/bin/env bash
set -euo pipefail

# get-next-version.sh
# Calculate the next version based on the latest git tag and output GitHub Actions variables
# Increments version until finding an unused tag to prevent version collisions
# Usage: get-next-version.sh

# Function to check if a version tag exists
version_tag_exists() {
  local version="$1"
  if git tag -l "$version" | grep -q "^${version}$"; then
    return 0  # Tag exists
  else
    return 1  # Tag does not exist
  fi
}

# Get the latest tag, or use v0.0.0 if no tags exist
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
echo "latest_tag=$LATEST_TAG" >> $GITHUB_OUTPUT

# Extract version number and increment
VERSION=$(echo $LATEST_TAG | sed 's/v//')
IFS='.' read -ra VERSION_PARTS <<< "$VERSION"
MAJOR=${VERSION_PARTS[0]:-0}
MINOR=${VERSION_PARTS[1]:-0}
PATCH=${VERSION_PARTS[2]:-0}

# Increment patch version
PATCH=$((PATCH + 1))
NEW_VERSION="v$MAJOR.$MINOR.$PATCH"

# Increment until we find an unused version number
MAX_ITERATIONS=100
iteration=0

while version_tag_exists "$NEW_VERSION"; do
  iteration=$((iteration + 1))

  if [ $iteration -ge $MAX_ITERATIONS ]; then
    echo "ERROR: Exceeded maximum iteration limit ($MAX_ITERATIONS) while searching for unused version number" >&2
    echo "This likely indicates a configuration or logic error in the release workflow" >&2
    exit 1
  fi

  echo "Version $NEW_VERSION already exists, incrementing to next version..."
  PATCH=$((PATCH + 1))
  NEW_VERSION="v$MAJOR.$MINOR.$PATCH"
done

echo "new_version=$NEW_VERSION" >> $GITHUB_OUTPUT
echo "New version will be: $NEW_VERSION"