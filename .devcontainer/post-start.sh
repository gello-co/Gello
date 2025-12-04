#!/bin/bash
# Post-start command: runs every time the devcontainer boots
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🚀 Post-start: syncing dependencies + ensuring Supabase is online"

# 1. Ensure node/bun deps are installed (safe even if already up-to-date)
if command -v bun >/dev/null 2>&1; then
  echo "📦 bun install (idempotent)..."
  bun install >/tmp/bun-install.log 2>&1 || {
    echo "⚠️  bun install had warnings (see /tmp/bun-install.log)"
  }
else
  echo "⚠️  Bun not found (should be baked into the container image)"
fi

# 2. Start Supabase automatically for visual feedback work
start_supabase() {
  if ! command -v supabase >/dev/null 2>&1; then
    echo "⚠️  Supabase CLI not found; skip auto-start. Install via Homebrew if needed."
    return
  fi

  echo "🔎 Checking Supabase status..."
  if supabase status >/tmp/supabase-status.log 2>&1; then
    echo "✅ Supabase already running"
    return
  fi

  echo "🟢 Starting Supabase services..."
  if supabase start >/tmp/supabase-start.log 2>&1; then
    echo "✅ Supabase started"
  else
    if grep -qi "already running" /tmp/supabase-start.log 2>/dev/null; then
      echo "ℹ️  Supabase reported it was already running"
    else
      echo "⚠️  Supabase failed to start. Check /tmp/supabase-start.log and run 'supabase start' manually."
      return
    fi
  fi

  # Optional seed so collaborators have data on first load
  if command -v bun >/dev/null 2>&1; then
    echo "🌱 Seeding database (idempotent)..."
    if bun run seed >/tmp/seed.log 2>&1; then
      echo "✅ Seed complete"
    else
      echo "⚠️  Seed script reported issues (see /tmp/seed.log). Continuing anyway."
    fi
  fi
}

start_supabase

# 3. Helpful heuristics / cleanup
if command -v doppler >/dev/null 2>&1; then
  if doppler me >/dev/null 2>&1; then
    echo "✅ Doppler configured"
  else
    echo "⚠️  Doppler not authenticated - run: bash .devcontainer/doppler-init.sh"
  fi
else
  echo "⚠️  Doppler CLI not found (expected in Dockerfile)"
fi

find /tmp -maxdepth 1 -name "devcontainer-*" -type f -mtime +7 -delete 2>/dev/null || true
find /tmp -maxdepth 1 -name "supabase-*" -type f -mtime +7 -delete 2>/dev/null || true
find /tmp -maxdepth 1 -name "seed-*" -type f -mtime +7 -delete 2>/dev/null || true

echo "✅ Post-start complete"

# Run health check if available
if [ -f ".devcontainer/healthcheck.sh" ]; then
  echo ""
  echo "🏥 Running health check..."
  bash .devcontainer/healthcheck.sh || true
fi
