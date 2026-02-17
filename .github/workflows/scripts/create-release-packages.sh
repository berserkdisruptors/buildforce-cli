#!/usr/bin/env bash
set -euo pipefail

# create-release-packages.sh (workflow-local)
# Build Buildforce CLI template release archives for each supported AI agent.
# Usage: .github/workflows/scripts/create-release-packages.sh <version>
#   Version argument should include leading 'v'.
#   Optionally set AGENTS env var to limit what gets built.
#     AGENTS  : space or comma separated subset of: claude cursor opencode (default: all)
#   Examples:
#     AGENTS=claude $0 v0.2.0
#     AGENTS="cursor,opencode" $0 v0.2.0

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <version-with-v-prefix>" >&2
  exit 1
fi
NEW_VERSION="$1"
if [[ ! $NEW_VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must look like v0.0.0" >&2
  exit 1
fi

echo "Building release packages for $NEW_VERSION"

# Create and use .genreleases directory for all build artifacts
GENRELEASES_DIR=".genreleases"
mkdir -p "$GENRELEASES_DIR"
rm -rf "$GENRELEASES_DIR"/* || true

generate_agents() {
  local agent=$1 output_dir=$2
  mkdir -p "$output_dir"
  for template in src/templates/agents/*.md; do
    [[ -f "$template" ]] || continue
    local name agents_field
    name=$(basename "$template" .md)

    # Normalize line endings
    file_content=$(tr -d '\r' < "$template")

    # Check for agent-specific filtering (same as commands)
    # If 'agents:' field exists in frontmatter, only include if current agent is in the list
    agents_field=$(printf '%s\n' "$file_content" | awk '/^agents:/ {sub(/^agents:[[:space:]]*/, ""); print; exit}' 2>/dev/null || true)
    if [[ -n "$agents_field" ]]; then
      # Use word boundary matching for reliable agent name detection
      if ! echo "$agents_field" | grep -qw "$agent"; then
        echo "  [filter] Skipping agent $name for $agent (agents: $agents_field)"
        continue
      else
        echo "  [filter] Including agent $name for $agent (agents: $agents_field)"
      fi
    fi

    # Remove the agents: field from frontmatter before copying
    local body
    body=$(printf '%s\n' "$file_content" | awk '
      /^---$/ { print; if (++dash_count == 1) in_frontmatter=1; else in_frontmatter=0; next }
      in_frontmatter && /^agents:/ { next }
      { print }
    ')

    echo "$body" > "$output_dir/$name.md"
  done
}

normalize_agents() {
  local agent=$1 output_dir=$2
  echo "  Normalizing agent templates for $agent..."
  npx tsx src/scripts/normalize-agent-templates.ts "$agent" "$output_dir"
}

generate_skills() {
  local agent=$1 output_dir=$2
  mkdir -p "$output_dir"

  # Skills are stored as directories containing SKILL.md
  for skill_dir in src/templates/skills/*/; do
    [[ -d "$skill_dir" ]] || continue
    local skill_file="$skill_dir/SKILL.md"
    [[ -f "$skill_file" ]] || continue

    local skill_name agents_field
    skill_name=$(basename "$skill_dir")

    # Normalize line endings and read SKILL.md
    file_content=$(tr -d '\r' < "$skill_file")

    # Check for agent-specific filtering via 'agents:' field in SKILL.md frontmatter
    # If 'agents:' field exists, only include if current agent is in the list
    agents_field=$(printf '%s\n' "$file_content" | awk '/^agents:/ {sub(/^agents:[[:space:]]*/, ""); print; exit}' 2>/dev/null || true)
    if [[ -n "$agents_field" ]]; then
      # Use word boundary matching for reliable agent name detection
      if ! echo "$agents_field" | grep -qw "$agent"; then
        echo "  [filter] Skipping skill $skill_name for $agent (agents: $agents_field)"
        continue
      else
        echo "  [filter] Including skill $skill_name for $agent (agents: $agents_field)"
      fi
    fi

    # Copy the entire skill directory structure (preserves all files in the skill folder)
    local dest_skill_dir="$output_dir/$skill_name"
    mkdir -p "$dest_skill_dir"
    cp -r "$skill_dir"/* "$dest_skill_dir/"
    echo "  Copied skill: $skill_name -> $dest_skill_dir"
  done
}

build_package() {
  local agent=$1
  local base_dir="$GENRELEASES_DIR/sdd-${agent}-package"
  echo "Building $agent package..."
  mkdir -p "$base_dir"

  # Copy base structure
  SPEC_DIR="$base_dir/.buildforce"
  mkdir -p "$SPEC_DIR"

  [[ -d memory ]] && { cp -r memory "$SPEC_DIR/"; echo "Copied memory -> .buildforce"; }

  if [[ -d src/context ]]; then
    mkdir -p "$SPEC_DIR/context"
    cp -r src/context/* "$SPEC_DIR/context/"
    echo "Copied src/context -> .buildforce/context"
  fi
  case $agent in
    claude)
      # Claude Code sub-agents
      if [[ -d src/templates/agents ]]; then
        mkdir -p "$base_dir/.claude/agents"
        generate_agents claude "$base_dir/.claude/agents"
      fi
      # Claude Code skills
      if [[ -d src/templates/skills ]]; then
        mkdir -p "$base_dir/.claude/skills"
        generate_skills claude "$base_dir/.claude/skills"
      fi
      # Claude Code hooks (Claude-specific script only)
      if [[ -f src/templates/hooks/claude/setup-explorer-subagent.sh ]]; then
        mkdir -p "$base_dir/.claude/hooks"
        cp src/templates/hooks/claude/setup-explorer-subagent.sh "$base_dir/.claude/hooks/"
      fi
      ;;
    cursor)
      # Cursor sub-agents
      if [[ -d src/templates/agents ]]; then
        mkdir -p "$base_dir/.cursor/agents"
        generate_agents cursor "$base_dir/.cursor/agents"
        normalize_agents cursor "$base_dir/.cursor/agents"
      fi
      # Cursor skills
      if [[ -d src/templates/skills ]]; then
        mkdir -p "$base_dir/.cursor/skills"
        generate_skills cursor "$base_dir/.cursor/skills"
      fi
      # Cursor hooks (Cursor-specific script only)
      if [[ -f src/templates/hooks/cursor/setup-explorer-subagent.sh ]]; then
        mkdir -p "$base_dir/.cursor/hooks"
        cp src/templates/hooks/cursor/setup-explorer-subagent.sh "$base_dir/.cursor/hooks/"
      fi
      ;;
    opencode)
      # OpenCode sub-agents
      if [[ -d src/templates/agents ]]; then
        mkdir -p "$base_dir/.opencode/agents"
        generate_agents opencode "$base_dir/.opencode/agents"
        normalize_agents opencode "$base_dir/.opencode/agents"
      fi
      # OpenCode skills
      if [[ -d src/templates/skills ]]; then
        mkdir -p "$base_dir/.opencode/skills"
        generate_skills opencode "$base_dir/.opencode/skills"
      fi
      # OpenCode plugin
      if [[ -f src/templates/hooks/opencode/setup-explorer-subagent.ts ]]; then
        mkdir -p "$base_dir/.opencode/plugins"
        cp src/templates/hooks/opencode/setup-explorer-subagent.ts \
           "$base_dir/.opencode/plugins/buildforce-explorer-redirect.ts"
      fi
      ;;
  esac
  ( cd "$base_dir" && zip -r "../buildforce-cli-template-${agent}-${NEW_VERSION}.zip" . )
  echo "Created $GENRELEASES_DIR/buildforce-cli-template-${agent}-${NEW_VERSION}.zip"
}

# Determine agent list
ALL_AGENTS=(claude cursor opencode)

norm_list() {
  # convert comma+space separated -> space separated unique while preserving order of first occurrence
  tr ',\n' '  ' | awk '{for(i=1;i<=NF;i++){if(!seen[$i]++){printf((out?" ":"") $i)}}}END{printf("\n")}'
}

validate_subset() {
  local type=$1; shift; local -n allowed=$1; shift; local items=("$@")
  local ok=1
  for it in "${items[@]}"; do
    local found=0
    for a in "${allowed[@]}"; do [[ $it == "$a" ]] && { found=1; break; }; done
    if [[ $found -eq 0 ]]; then
      echo "Error: unknown $type '$it' (allowed: ${allowed[*]})" >&2
      ok=0
    fi
  done
  [[ $ok -eq 1 ]]
}

if [[ -n ${AGENTS:-} ]]; then
  mapfile -t AGENT_LIST < <(printf '%s' "$AGENTS" | norm_list)
  validate_subset agent ALL_AGENTS "${AGENT_LIST[@]}" || exit 1
else
  AGENT_LIST=("${ALL_AGENTS[@]}")
fi

echo "Agents: ${AGENT_LIST[*]}"

for agent in "${AGENT_LIST[@]}"; do
  build_package "$agent"
done

echo "Archives in $GENRELEASES_DIR:"
ls -1 "$GENRELEASES_DIR"/buildforce-cli-template-*-"${NEW_VERSION}".zip
