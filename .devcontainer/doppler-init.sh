#!/bin/bash
set -euo pipefail

echo "🔐 Initializing Doppler CLI..."

if ! command -v doppler >/dev/null 2>&1; then
  echo "⚠️  Doppler CLI is not installed (expected inside devcontainer). Skipping auth."
  exit 0
fi

# If already authenticated, nothing to do
if doppler me >/dev/null 2>&1; then
  echo "✅ Doppler already authenticated"
  exit 0
fi

# Use env token when provided, otherwise prompt
if [ -z "${DOPPLER_TOKEN:-}" ]; then
  echo "📥 Doppler token not found in DOPPLER_TOKEN environment variable"
  read -s -p "   Paste Doppler Token: " DOPPLER_TOKEN
  echo ""
fi

if [ -z "${DOPPLER_TOKEN:-}" ]; then
  cat <<'EOF'
❌ Doppler token is required for CLI access.

Options:
  1. Export DOPPLER_TOKEN in your host shell before rebuilding the container, or
  2. Run this script again and paste the token when prompted, or
  3. Run "doppler login" interactively inside the container.
EOF
  exit 1
fi

echo "🔑 Authenticating Doppler..."
if echo "$DOPPLER_TOKEN" | doppler configure set token --scope . --silent; then
  if doppler me >/dev/null 2>&1; then
    echo "✅ Doppler authentication verified"
    exit 0
  fi
fi

cat <<'EOF'
⚠️  Doppler authentication failed (token may be invalid).
Try running: doppler login --scope . --project gello --config dev
EOF
exit 1
