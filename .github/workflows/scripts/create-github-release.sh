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
  .genreleases/buildforce-cli-template-copilot-sh-"$VERSION".zip \
  .genreleases/buildforce-cli-template-copilot-ps-"$VERSION".zip \
  .genreleases/buildforce-cli-template-claude-sh-"$VERSION".zip \
  .genreleases/buildforce-cli-template-claude-ps-"$VERSION".zip \
  .genreleases/buildforce-cli-template-gemini-sh-"$VERSION".zip \
  .genreleases/buildforce-cli-template-gemini-ps-"$VERSION".zip \
  .genreleases/buildforce-cli-template-cursor-sh-"$VERSION".zip \
  .genreleases/buildforce-cli-template-cursor-ps-"$VERSION".zip \
  .genreleases/buildforce-cli-template-opencode-sh-"$VERSION".zip \
  .genreleases/buildforce-cli-template-opencode-ps-"$VERSION".zip \
  .genreleases/buildforce-cli-template-qwen-sh-"$VERSION".zip \
  .genreleases/buildforce-cli-template-qwen-ps-"$VERSION".zip \
  .genreleases/buildforce-cli-template-windsurf-sh-"$VERSION".zip \
  .genreleases/buildforce-cli-template-windsurf-ps-"$VERSION".zip \
  .genreleases/buildforce-cli-template-codex-sh-"$VERSION".zip \
  .genreleases/buildforce-cli-template-codex-ps-"$VERSION".zip \
  .genreleases/buildforce-cli-template-kilocode-sh-"$VERSION".zip \
  .genreleases/buildforce-cli-template-kilocode-ps-"$VERSION".zip \
  .genreleases/buildforce-cli-template-auggie-sh-"$VERSION".zip \
  .genreleases/buildforce-cli-template-auggie-ps-"$VERSION".zip \
  .genreleases/buildforce-cli-template-roo-sh-"$VERSION".zip \
  .genreleases/buildforce-cli-template-roo-ps-"$VERSION".zip \
  --title "Buildforce CLI Templates - $VERSION_NO_V" \
  --notes-file release_notes.md