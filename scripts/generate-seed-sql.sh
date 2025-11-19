#!/bin/bash
# Generate seed.sql from Snaplet Seed for Supabase CLI integration
# This script loads Supabase env vars and generates SQL output

set -e

cd "$(dirname "$0")/.."

# Load Supabase environment variables
if ! bunx supabase status > /dev/null 2>&1; then
  echo "❌ Error: Supabase is not running. Start it with: bun run supabase:start"
  exit 1
fi

# Load env vars from supabase status (filter out warnings and empty lines)
set -a
eval "$(bunx supabase status -o env 2>/dev/null | grep -v "Stopped services" | grep -v "^$" | grep -E "^[A-Z_]+=")"
set +a

# Generate seed.sql from Snaplet Seed (dry run mode outputs SQL)
# Capture stderr to filter known non-critical messages and detect real errors
echo "🌱 Generating seed.sql from Snaplet Seed..."
stderr_file=$(mktemp)
trap 'rm -f "$stderr_file"' EXIT

bun supabase/seed/seed.ts 2>"$stderr_file" | grep -v "^error:" | grep -v "^Bun v" | grep -v "^$" > supabase/seed.sql.tmp || {
  # Check stderr even if command failed
  filtered_stderr=$(grep -v "^error:" "$stderr_file" | grep -v "^Bun v" | grep -v "^$" || true)
  if [ -n "$filtered_stderr" ]; then
    echo "⚠️  Error output during seed generation:" >&2
    echo "$filtered_stderr" >&2
  fi
  rm -f supabase/seed.sql.tmp
  echo "❌ Failed to generate seed.sql (command failed)"
  exit 1
}

# Filter known non-critical stderr messages and check for unexpected errors
filtered_stderr=$(grep -v "^error:" "$stderr_file" | grep -v "^Bun v" | grep -v "^$" || true)
if [ -n "$filtered_stderr" ]; then
  echo "⚠️  Unexpected stderr output during seed generation:" >&2
  echo "$filtered_stderr" >&2
  rm -f supabase/seed.sql.tmp
  echo "❌ Failed to generate seed.sql (unexpected errors detected)"
  exit 1
fi

# Verify the output is valid SQL (contains INSERT statements)
if grep -q "INSERT INTO" supabase/seed.sql.tmp; then
  mv supabase/seed.sql.tmp supabase/seed.sql
  echo "✅ Generated supabase/seed.sql"
  echo "   File size: $(wc -l < supabase/seed.sql) lines"
else
  rm -f supabase/seed.sql.tmp
  echo "❌ Failed to generate valid seed.sql (no INSERT statements found)"
  exit 1
fi

