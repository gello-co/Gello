#!/bin/bash
# Post-start command: Runs every time container starts (after creation)
#
# This script is intentionally minimal. Most startup logic lives elsewhere:
# - Container creation: .devcontainer/post-create.sh (runs once on first create)
# - Development startup: scripts/start-dev.sh (runs when you execute `bun run start`)
#
# Note: devcontainer.json also runs `bun install` via postStartCommand
# to ensure dependencies are up-to-date on every container start.

# Don't use set -e here - we want non-critical checks to not fail container startup
set +e

cd "$(dirname "$0")/.."

# Quick verification: Check if Doppler is configured (non-blocking)
# Doppler setup happens in post-create.sh, but verify it's still available
if command -v doppler &> /dev/null; then
  if doppler me &> /dev/null; then
    echo "✅ Doppler configured"
  else
    echo "⚠️  Doppler not authenticated - run: bash .devcontainer/doppler-init.sh"
  fi
else
  echo "⚠️  Doppler CLI not found - should be installed in Dockerfile"
fi

# Clean up old temp files (older than 7 days) - non-blocking
find /tmp -maxdepth 1 -name "devcontainer-*" -type f -mtime +7 -delete 2>/dev/null || true
find /tmp -maxdepth 1 -name "supabase-*" -type f -mtime +7 -delete 2>/dev/null || true
find /tmp -maxdepth 1 -name "seed-*" -type f -mtime +7 -delete 2>/dev/null || true
