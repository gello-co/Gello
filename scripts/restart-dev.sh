#!/bin/bash
# Restart script for development environment
# Stops all services, restarts Supabase, and starts the server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🛑 Stopping existing services..."
# Kill any running bun processes for this project (project-scoped)
# Use two-step approach: find candidates, filter by working directory, then kill

kill_project_processes() {
  local pattern=$1
  local description=$2

  # Step 1: Find candidate PIDs using pgrep
  local candidate_pids
  candidate_pids=$(pgrep -f "$pattern" 2>/dev/null || true)

  if [ -z "$candidate_pids" ]; then
    echo "   ℹ️  No $description processes found"
    return 0
  fi

  # Step 2: Filter by working directory (project-scoped)
  local matching_pids=()
  for pid in $candidate_pids; do
    # Check if process working directory matches project root
    local proc_cwd
    # Try multiple methods: lsof (macOS/Linux), /proc (Linux), pwdx (Linux)
    if command -v lsof &> /dev/null; then
      proc_cwd=$(lsof -a -d cwd -p "$pid" -Fn 2>/dev/null | grep '^n' | cut -c2-)
    elif [ -e "/proc/$pid/cwd" ]; then
      proc_cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
    else
      # Fallback: skip directory check on unsupported systems
      proc_cwd="$PROJECT_ROOT"
    fi

    if [ -n "$proc_cwd" ] && [ "$proc_cwd" = "$PROJECT_ROOT" ]; then
      matching_pids+=("$pid")
    fi
  done

  # Step 3: Kill filtered PIDs
  if [ ${#matching_pids[@]} -eq 0 ]; then
    echo "   ℹ️  No $description processes found in project directory"
    return 0
  fi

  # Optionally print for verification
  echo "   Found ${#matching_pids[@]} $description process(es) in project directory"

  # Kill each matching PID
  for pid in "${matching_pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done

  # Wait briefly for graceful shutdown
  sleep 0.5

  # Force kill any that are still running
  for pid in "${matching_pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
}

# Kill project-specific processes
kill_project_processes "bun.*ProjectSourceCode/src/index.ts" "server"
kill_project_processes "bun.*test:server" "test server"

sleep 2

echo "🔄 Checking Supabase status..."
# Check if Supabase is running, start if not
if ! bunx supabase status > /dev/null 2>&1; then
  echo "   Starting Supabase..."
  bunx supabase start
else
  echo "   Supabase is already running"
fi

echo "📋 Loading environment variables..."
# Load Supabase environment variables
eval "$(bunx supabase status -o env)"

# Export required variables
export SUPABASE_URL="$API_URL"
export SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export NODE_ENV="development"

echo "✅ Environment loaded:"
echo "   SUPABASE_URL: ${SUPABASE_URL:0:30}..."
echo "   PUBLISHABLE_KEY: ${SUPABASE_PUBLISHABLE_KEY:0:20}..."
echo "   SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."

# Automatically seed database (idempotent - safe to run multiple times)
echo ""
echo "🌱 Seeding database with test data..."
# Seed script loads Supabase env vars itself, but use doppler for auth-related env vars
if doppler run -- bun run seed > /tmp/seed-output.log 2>&1; then
  echo "✅ Database seeded successfully"
else
  echo "⚠️  Database seeding had issues (this is OK if data already exists)"
fi

echo ""
echo "🚀 Starting server..."
echo "   Server will run at http://localhost:3000"
echo "   Press Ctrl+C to stop"
echo ""

# Start server with hot reload
bun --hot ProjectSourceCode/src/index.ts
