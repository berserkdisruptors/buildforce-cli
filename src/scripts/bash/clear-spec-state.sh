#!/usr/bin/env bash

set -e

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Get buildforce root using common function
BUILDFORCE_ROOT=$(get_buildforce_root) || exit 1

cd "$BUILDFORCE_ROOT"

# Clear the current spec state
clear_current_spec "$BUILDFORCE_ROOT"

echo "Spec state cleared successfully"
