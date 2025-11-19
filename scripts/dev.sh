#!/bin/bash
# Wrapper script to run the dev server with Supabase env vars auto-loaded

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load Supabase environment variables so the dev server can authenticate locally.
# shellcheck source=/dev/null
if ! source "$REPO_ROOT/scripts/load-local-env.sh"; then
  echo "❌ Failed to load Supabase environment variables. Ensure Supabase is running." >&2
  echo "   Start it with: bun run supabase:start" >&2
  exit 1
fi

echo "🚀 Starting Bun dev server with Supabase env vars"

if command -v doppler >/dev/null 2>&1 && doppler me >/dev/null 2>&1; then
  echo "🔐 Doppler authenticated – running with managed secrets"
  exec doppler run -- bun --hot "$REPO_ROOT/ProjectSourceCode/src/index.ts"
else
  if command -v doppler >/dev/null 2>&1; then
    echo "⚠️  Doppler unavailable or unauthenticated. Falling back to local env only." >&2
  else
    echo "ℹ️  Doppler CLI not installed; proceeding without Doppler-managed secrets." >&2
  fi
  export CSRF_SECRET="${CSRF_SECRET:-dev-default-csrf-secret}"
  echo "🔐 Using fallback CSRF_SECRET=${CSRF_SECRET}"
  exec bun --hot "$REPO_ROOT/ProjectSourceCode/src/index.ts"
fi

