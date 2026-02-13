#!/usr/bin/env bash
set -euo pipefail

# create-release-packages.sh (workflow-local)
# Build Buildforce CLI template release archives for each supported AI assistant and script type.
# Usage: .github/workflows/scripts/create-release-packages.sh <version>
#   Version argument should include leading 'v'.
#   Optionally set AGENTS and/or SCRIPTS env vars to limit what gets built.
#     AGENTS  : space or comma separated subset of: claude gemini copilot cursor qwen opencode windsurf codex (default: all)
#     SCRIPTS : space or comma separated subset of: sh ps (default: both)
#   Examples:
#     AGENTS=claude SCRIPTS=sh $0 v0.2.0
#     AGENTS="copilot,gemini" $0 v0.2.0
#     SCRIPTS=ps $0 v0.2.0

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

rewrite_paths() {
  sed -E \
    -e 's@(/?)memory/@.buildforce/memory/@g' \
    -e 's@(/?)src/scripts/@.buildforce/scripts/@g' \
    -e 's@(/?)src/templates/@.buildforce/templates/@g'
}

generate_commands() {
  local agent=$1 ext=$2 arg_format=$3 output_dir=$4 script_variant=$5
  mkdir -p "$output_dir"
  for template in src/templates/commands/*.md; do
    [[ -f "$template" ]] || continue
    local name description script_command body agents_field
    name=$(basename "$template" .md)

    # Normalize line endings
    file_content=$(tr -d '\r' < "$template")

    # Check for agent-specific command filtering
    # If 'agents:' field exists in frontmatter, only include if current agent is in the list
    agents_field=$(printf '%s\n' "$file_content" | awk '/^agents:/ {sub(/^agents:[[:space:]]*/, ""); print; exit}' 2>/dev/null || true)
    if [[ -n "$agents_field" ]]; then
      # agents_field looks like "[claude]" or "[claude, cursor]" - check if current agent is included
      # Use word boundary matching (-w) for reliable agent name detection
      if ! echo "$agents_field" | grep -qw "$agent"; then
        echo "  [filter] Skipping $name for $agent (agents: $agents_field)"
        continue
      else
        echo "  [filter] Including $name for $agent (agents: $agents_field)"
      fi
    fi

    # Extract description and script command from YAML frontmatter
    description=$(printf '%s\n' "$file_content" | awk '/^description:/ {sub(/^description:[[:space:]]*/, ""); print; exit}' 2>/dev/null || true)
    script_command=$(printf '%s\n' "$file_content" | awk -v sv="$script_variant" '/^[[:space:]]*'"$script_variant"':[[:space:]]*/ {sub(/^[[:space:]]*'"$script_variant"':[[:space:]]*/, ""); print; exit}' 2>/dev/null || true)
    
    if [[ -z $script_command ]]; then
      echo "Warning: no script command found for $script_variant in $template" >&2
      script_command="(Missing script command for $script_variant)"
    fi
    
    # Replace {SCRIPT} placeholder with the script command
    body=$(printf '%s\n' "$file_content" | sed "s|{SCRIPT}|${script_command}|g")
    
    # Remove the scripts: section and agents: field from frontmatter while preserving YAML structure
    body=$(printf '%s\n' "$body" | awk '
      /^---$/ { print; if (++dash_count == 1) in_frontmatter=1; else in_frontmatter=0; next }
      in_frontmatter && /^scripts:$/ { skip_scripts=1; next }
      in_frontmatter && /^[a-zA-Z].*:/ && skip_scripts { skip_scripts=0 }
      in_frontmatter && skip_scripts && /^[[:space:]]/ { next }
      in_frontmatter && /^agents:/ { next }
      { print }
    ')
    
    # Apply other substitutions
    body=$(printf '%s\n' "$body" | sed "s/{ARGS}/$arg_format/g" | sed "s/__AGENT__/$agent/g" | rewrite_paths)
    
    case $ext in
      toml)
        { echo "description = \"$description\""; echo; echo "prompt = \"\"\""; echo "$body"; echo "\"\"\""; } > "$output_dir/buildforce.$name.$ext" ;;
      md)
        echo "$body" > "$output_dir/buildforce.$name.$ext" ;;
      prompt.md)
        echo "$body" > "$output_dir/buildforce.$name.$ext" ;;
    esac
  done
}

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

build_variant() {
  local agent=$1 script=$2
  local base_dir="$GENRELEASES_DIR/sdd-${agent}-package-${script}"
  echo "Building $agent ($script) package..."
  mkdir -p "$base_dir"

  # Copy base structure but filter scripts by variant
  SPEC_DIR="$base_dir/.buildforce"
  mkdir -p "$SPEC_DIR"

  [[ -d memory ]] && { cp -r memory "$SPEC_DIR/"; echo "Copied memory -> .buildforce"; }

  # Only copy the relevant script variant directory
  if [[ -d src/scripts ]]; then
    mkdir -p "$SPEC_DIR/scripts"
    case $script in
      sh)
        [[ -d src/scripts/bash ]] && { cp -r src/scripts/bash "$SPEC_DIR/scripts/"; echo "Copied src/scripts/bash -> .buildforce/scripts"; }
        # Copy any script files that aren't in variant-specific directories
        find src/scripts -maxdepth 1 -type f -exec cp {} "$SPEC_DIR/scripts/" \; 2>/dev/null || true
        ;;
      ps)
        [[ -d src/scripts/powershell ]] && { cp -r src/scripts/powershell "$SPEC_DIR/scripts/"; echo "Copied src/scripts/powershell -> .buildforce/scripts"; }
        # Copy any script files that aren't in variant-specific directories
        find src/scripts -maxdepth 1 -type f -exec cp {} "$SPEC_DIR/scripts/" \; 2>/dev/null || true
        ;;
    esac
  fi

  if [[ -d src/templates ]]; then
    mkdir -p "$SPEC_DIR/templates"
    # Copy template files, excluding commands, agents, and skills subdirectories
    # (commands go to agent-specific folders, agents go to .claude/agents/, skills go to .claude/skills/)
    find src/templates -type f -not -path "src/templates/commands/*" -not -path "src/templates/agents/*" -not -path "src/templates/skills/*" | while read -r file; do
      # Get the relative path from src/templates
      rel_path="${file#src/templates/}"
      dest_file="$SPEC_DIR/templates/$rel_path"
      # Create parent directories if needed
      mkdir -p "$(dirname "$dest_file")"
      cp "$file" "$dest_file"
    done
    echo "Copied src/templates -> .buildforce/templates"
  fi

  if [[ -d src/context ]]; then
    mkdir -p "$SPEC_DIR/context"
    cp -r src/context/* "$SPEC_DIR/context/"
    echo "Copied src/context -> .buildforce/context"
  fi
  # Inject variant into plan-template.md within .buildforce/templates if present
  local plan_tpl="$base_dir/.buildforce/templates/plan-template.md"
  if [[ -f "$plan_tpl" ]]; then
    plan_norm=$(tr -d '\r' < "$plan_tpl")
    # Extract script command from YAML frontmatter
    script_command=$(printf '%s\n' "$plan_norm" | awk -v sv="$script" '/^[[:space:]]*'"$script"':[[:space:]]*/ {sub(/^[[:space:]]*'"$script"':[[:space:]]*/, ""); print; exit}' 2>/dev/null || true)
    if [[ -n $script_command ]]; then
      # Always prefix with .buildforce/ for plan usage
      script_command=".buildforce/$script_command"
      # Replace {SCRIPT} placeholder with the script command and __AGENT__ with agent name
      substituted=$(sed "s|{SCRIPT}|${script_command}|g" "$plan_tpl" | tr -d '\r' | sed "s|__AGENT__|${agent}|g")
      # Strip YAML frontmatter from plan template output (keep body only)
      stripped=$(printf '%s\n' "$substituted" | awk 'BEGIN{fm=0;dash=0} /^---$/ {dash++; if(dash==1){fm=1; next} else if(dash==2){fm=0; next}} {if(!fm) print}')
      printf '%s\n' "$stripped" > "$plan_tpl"
    else
      echo "Warning: no plan-template script command found for $script in YAML frontmatter" >&2
    fi
  fi
  # NOTE: We substitute {ARGS} internally. Outward tokens differ intentionally:
  #   * Markdown/prompt (claude, copilot, cursor, opencode): $ARGUMENTS
  #   * TOML (gemini, qwen): {{args}}
  # This keeps formats readable without extra abstraction.

  case $agent in
    claude)
      mkdir -p "$base_dir/.claude/commands"
      generate_commands claude md "\$ARGUMENTS" "$base_dir/.claude/commands" "$script"
      # Claude Code supports sub-agents - generate them if any exist
      if [[ -d src/templates/agents ]]; then
        mkdir -p "$base_dir/.claude/agents"
        generate_agents claude "$base_dir/.claude/agents"
      fi
      # Claude Code supports skills - generate them if any exist. TODO: add support for other agents
      if [[ -d src/templates/skills ]]; then
        mkdir -p "$base_dir/.claude/skills"
        generate_skills claude "$base_dir/.claude/skills"
      fi
      ;;
    gemini)
      mkdir -p "$base_dir/.gemini/commands"
      generate_commands gemini toml "{{args}}" "$base_dir/.gemini/commands" "$script"
      [[ -f agent_templates/gemini/GEMINI.md ]] && cp agent_templates/gemini/GEMINI.md "$base_dir/GEMINI.md" ;;
    copilot)
      mkdir -p "$base_dir/.github/prompts"
      generate_commands copilot prompt.md "\$ARGUMENTS" "$base_dir/.github/prompts" "$script" ;;
    cursor)
      mkdir -p "$base_dir/.cursor/commands"
      generate_commands cursor md "\$ARGUMENTS" "$base_dir/.cursor/commands" "$script" ;;
    qwen)
      mkdir -p "$base_dir/.qwen/commands"
      generate_commands qwen toml "{{args}}" "$base_dir/.qwen/commands" "$script"
      [[ -f agent_templates/qwen/QWEN.md ]] && cp agent_templates/qwen/QWEN.md "$base_dir/QWEN.md" ;;
    opencode)
      mkdir -p "$base_dir/.opencode/command"
      generate_commands opencode md "\$ARGUMENTS" "$base_dir/.opencode/command" "$script" ;;
    windsurf)
      mkdir -p "$base_dir/.windsurf/workflows"
      generate_commands windsurf md "\$ARGUMENTS" "$base_dir/.windsurf/workflows" "$script" ;;
    codex)
      mkdir -p "$base_dir/.codex/prompts"
      generate_commands codex md "\$ARGUMENTS" "$base_dir/.codex/prompts" "$script" ;;
    kilocode)
      mkdir -p "$base_dir/.kilocode/workflows"
      generate_commands kilocode md "\$ARGUMENTS" "$base_dir/.kilocode/workflows" "$script" ;;
    auggie)
      mkdir -p "$base_dir/.augment/commands"
      generate_commands auggie md "\$ARGUMENTS" "$base_dir/.augment/commands" "$script" ;;
    roo)
      mkdir -p "$base_dir/.roo/commands"
      generate_commands roo md "\$ARGUMENTS" "$base_dir/.roo/commands" "$script" ;;
  esac
  ( cd "$base_dir" && zip -r "../buildforce-cli-template-${agent}-${script}-${NEW_VERSION}.zip" . )
  echo "Created $GENRELEASES_DIR/buildforce-cli-template-${agent}-${script}-${NEW_VERSION}.zip"
}

# Determine agent list
ALL_AGENTS=(claude gemini copilot cursor qwen opencode windsurf codex kilocode auggie roo)
ALL_SCRIPTS=(sh ps)


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

if [[ -n ${SCRIPTS:-} ]]; then
  mapfile -t SCRIPT_LIST < <(printf '%s' "$SCRIPTS" | norm_list)
  validate_subset script ALL_SCRIPTS "${SCRIPT_LIST[@]}" || exit 1
else
  SCRIPT_LIST=("${ALL_SCRIPTS[@]}")
fi

echo "Agents: ${AGENT_LIST[*]}"
echo "Scripts: ${SCRIPT_LIST[*]}"

for agent in "${AGENT_LIST[@]}"; do
  for script in "${SCRIPT_LIST[@]}"; do
    build_variant "$agent" "$script"
  done
done

echo "Archives in $GENRELEASES_DIR:"
ls -1 "$GENRELEASES_DIR"/buildforce-cli-template-*-"${NEW_VERSION}".zip
