#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🔧 Running devcontainer bootstrap..."

if [ -f ".devcontainer/post-create.sh" ]; then
  bash .devcontainer/post-create.sh
fi

# post-start contains lightweight health helpers; run once here for parity
if [ -f ".devcontainer/post-start.sh" ]; then
  bash .devcontainer/post-start.sh || true
fi

echo "✅ Devcontainer bootstrap complete."
