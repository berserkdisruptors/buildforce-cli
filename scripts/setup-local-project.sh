#!/bin/bash

# Setup a local BuildForce project for testing (without GitHub releases)
# Usage: ./scripts/setup-local-project.sh <project-name>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <project-name>"
  exit 1
fi

PROJECT_NAME="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Creating BuildForce project: $PROJECT_NAME"
echo "📁 Location: $(pwd)/$PROJECT_NAME"
echo ""

# Create project directory
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Create .claude/commands directory
echo "📝 Setting up Claude Code slash commands..."
mkdir -p .claude/commands

# Copy all commands with buildforce- prefix
for cmd_file in "$REPO_ROOT/templates/commands"/*.md; do
  filename=$(basename "$cmd_file")
  cp "$cmd_file" ".claude/commands/buildforce-$filename"
  echo "  ✓ /buildforce-${filename%.md}"
done

# Create templates directory
echo ""
echo "📚 Setting up templates..."
mkdir -p templates

# Copy template files
cp "$REPO_ROOT/templates/spec-template.md" templates/
cp "$REPO_ROOT/templates/plan-template.md" templates/
cp "$REPO_ROOT/templates/tasks-template.md" templates/
echo "  ✓ spec-template.md"
echo "  ✓ plan-template.md"
echo "  ✓ tasks-template.md"

# Create memory directory for constitution
echo ""
echo "📋 Setting up project structure..."
mkdir -p memory
mkdir -p specs

# Create a basic README
cat > README.md << 'EOF'
# BuildForce Project

This project was initialized with BuildForce - a Spec-Driven Development toolkit.

## Available Commands

Use these slash commands in Claude Code:

1. `/buildforce-constitution` - Create project principles
2. `/buildforce-specify` - Create feature specification
3. `/buildforce-clarify` - Ask structured questions (optional)
4. `/buildforce-plan` - Generate implementation plan
5. `/buildforce-tasks` - Create task breakdown
6. `/buildforce-analyze` - Consistency analysis (optional)
7. `/buildforce-implement` - Execute implementation

## Workflow

```
/buildforce-constitution → /buildforce-specify → /buildforce-plan → /buildforce-tasks → /buildforce-implement
```

## Directory Structure

- `.claude/commands/` - Slash command definitions
- `templates/` - Template files for specs, plans, tasks
- `memory/` - Project constitution and governance
- `specs/` - Feature specifications and plans
EOF

# Initialize git if available
if command -v git &> /dev/null; then
  echo ""
  echo "🔧 Initializing git repository..."
  git init
  git add .
  git commit -m "Initial BuildForce project setup"
  echo "  ✓ Git repository initialized"
fi

echo ""
echo "✅ Project ready!"
echo ""
echo "Next steps:"
echo "  1. cd $PROJECT_NAME"
echo "  2. claude"
echo "  3. Start with: /buildforce-constitution"
echo ""
