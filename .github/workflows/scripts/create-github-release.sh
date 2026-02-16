#!/usr/bin/env bash
set -euo pipefail

# create-github-release.sh
# Create a GitHub release with all template zip files
# Usage: create-github-release.sh <version>

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

VERSION="$1"

# Remove 'v' prefix from version for release title
VERSION_NO_V=${VERSION#v}

gh release create "$VERSION" \
  .genreleases/buildforce-cli-template-claude-"$VERSION".zip \
  .genreleases/buildforce-cli-template-cursor-"$VERSION".zip \
  .genreleases/buildforce-cli-template-opencode-"$VERSION".zip \
  --title "Buildforce CLI Templates - $VERSION_NO_V" \
  --notes-file release_notes.md
