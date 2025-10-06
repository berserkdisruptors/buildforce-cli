#!/usr/bin/env bash
set -euo pipefail

# update-version.sh
# Update version in package.json (for release artifacts only)
# Usage: update-version.sh <version>

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

VERSION="$1"

# Remove 'v' prefix for npm versioning
NPM_VERSION=${VERSION#v}

if [ -f "package.json" ]; then
  sed -i "s/\"version\": \".*\"/\"version\": \"$NPM_VERSION\"/" package.json
  echo "Updated package.json version to $NPM_VERSION (for release artifacts only)"
else
  echo "Warning: package.json not found, skipping version update"
fi