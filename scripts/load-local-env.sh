#!/bin/bash
# Load local Supabase environment variables
# Usage: source scripts/load-local-env.sh
# Or: eval $(bun run supabase:env)

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Script is in scripts/, so repo root is one level up
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Loading local Supabase environment variables..."

# Verify the Supabase config exists
if [ ! -f "$REPO_ROOT/supabase/config.toml" ]; then
  echo "Error: Not in a valid Supabase project directory"
  echo "Expected: $REPO_ROOT/supabase/config.toml"
  return 1 2>/dev/null || exit 1
fi

# Get environment variables and filter out "Stopped services" warnings
# Use a temporary file to avoid subshell issues with eval
TMP_ENV=$(mktemp 2>/dev/null || echo /tmp/supabase-env-$$)
# Run from the correct directory explicitly using absolute path
(cd "$REPO_ROOT" && bunx supabase status -o env 2>&1) | grep -v "^Stopped services:" > "$TMP_ENV" 2>/dev/null

# Check if we got valid environment variables
if [ ! -s "$TMP_ENV" ] || ! grep -qE "(API_URL|PUBLISHABLE_KEY|ANON_KEY)" "$TMP_ENV" 2>/dev/null; then
  echo "Error: Local Supabase is not running or failed to get environment variables."
  echo "Start it with: bun run supabase:start"
  rm -f "$TMP_ENV" 2>/dev/null
  return 1 2>/dev/null || exit 1
fi

# Export environment variables from bunx supabase status
set -a  # Automatically export all variables
eval "$(cat "$TMP_ENV")" 2>/dev/null
set +a
rm -f "$TMP_ENV" 2>/dev/null

# Map new API key format to expected environment variable names
# New format: PUBLISHABLE_KEY (sb_publishable_...) and SECRET_KEY (sb_secret_...)
# Old format: ANON_KEY and SERVICE_ROLE_KEY (JWT format)
# Prioritize new format, fallback to old format for backward compatibility
if [ -n "$PUBLISHABLE_KEY" ]; then
  export SUPABASE_LOCAL_ANON_KEY="$PUBLISHABLE_KEY"
  export SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
fi
if [ -n "$SECRET_KEY" ]; then
  export SUPABASE_LOCAL_SERVICE_ROLE_KEY="$SECRET_KEY"
  export SUPABASE_SERVICE_ROLE_KEY="$SECRET_KEY"
fi
# Fallback to old format if new format not available
if [ -z "$SUPABASE_LOCAL_ANON_KEY" ] && [ -n "$ANON_KEY" ]; then
  export SUPABASE_LOCAL_ANON_KEY="$ANON_KEY"
  export SUPABASE_PUBLISHABLE_KEY="$ANON_KEY"
fi
if [ -z "$SUPABASE_LOCAL_SERVICE_ROLE_KEY" ] && [ -n "$SERVICE_ROLE_KEY" ]; then
  export SUPABASE_LOCAL_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
  export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
fi

# Map API_URL to SUPABASE_URL
if [ -n "$API_URL" ]; then
  export SUPABASE_LOCAL_URL="$API_URL"
  export SUPABASE_URL="$API_URL"
fi

echo "Local Supabase environment variables loaded!"
echo "SUPABASE_URL=$SUPABASE_URL"
if [ -n "$SUPABASE_LOCAL_ANON_KEY" ]; then
  echo "SUPABASE_PUBLISHABLE_KEY=${SUPABASE_LOCAL_ANON_KEY:0:30}..."
fi
if [ -n "$SUPABASE_LOCAL_SERVICE_ROLE_KEY" ]; then
  echo "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_LOCAL_SERVICE_ROLE_KEY:0:30}..."
fi

