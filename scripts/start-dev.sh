#!/bin/bash
# Start development environment: Supabase + Dev Server
# This script ensures Supabase is running and ready before starting the dev server

set -e

cd "$(dirname "$0")/.."

# Load test user credentials from .env.local (or .env) with fallbacks
# Credentials match seeded users in scripts/seed-db-snaplet.ts
load_test_credentials() {
  # Try .env.local first, then .env
  local env_file=".env.local"
  if [ ! -f "$env_file" ]; then
    env_file=".env"
  fi

  # Source env file if it exists
  if [ -f "$env_file" ]; then
    set -a
    source "$env_file" 2>/dev/null || true
    set +a
  fi

  # Set defaults from seed file if not provided
  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
  MANAGER_EMAIL="${MANAGER_EMAIL:-manager@example.com}"
  MEMBER_EMAIL="${MEMBER_EMAIL:-member@example.com}"
  DEV_PASSWORD="${DEV_PASSWORD:-password123}"

  # Use individual passwords if set, otherwise use DEV_PASSWORD
  ADMIN_PASSWORD="${ADMIN_PASSWORD:-$DEV_PASSWORD}"
  MANAGER_PASSWORD="${MANAGER_PASSWORD:-$DEV_PASSWORD}"
  MEMBER_PASSWORD="${MEMBER_PASSWORD:-$DEV_PASSWORD}"

  # Validate required variables are set
  if [ -z "$ADMIN_EMAIL" ] || [ -z "$MANAGER_EMAIL" ] || [ -z "$MEMBER_EMAIL" ] || [ -z "$DEV_PASSWORD" ]; then
    echo "❌ Error: Missing required credential variables"
    echo "   Required: ADMIN_EMAIL, MANAGER_EMAIL, MEMBER_EMAIL, DEV_PASSWORD"
    echo "   Create .env.local from .env.example or set environment variables"
    exit 1
  fi
}

# Load credentials
load_test_credentials

echo "🚀 Starting Gello development environment..."

# Check if Supabase CLI is available
if ! command -v bunx &> /dev/null; then
  echo "❌ Error: bunx not found. Install Bun first: https://bun.sh"
  exit 1
fi

# Quick check for Playwright browsers (needed for MCP browser tools)
if [ ! -d "node_modules/@playwright" ]; then
  echo "⚠️  Playwright browsers not installed - installing now..."
  bunx playwright install --with-deps || echo "⚠️  Playwright install failed (E2E tests may not work)"
else
  echo "✅ Playwright browsers available (for MCP browser tools and E2E tests)"
fi

# Function to check if Supabase is running
check_supabase_running() {
  if bunx supabase status > /dev/null 2>&1; then
    # Try to get API URL to verify it's actually ready
    if bunx supabase status -o env 2>&1 | grep -q "API_URL" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

# Function to wait for Supabase to be ready
wait_for_supabase() {
  echo "⏳ Waiting for Supabase to be ready..."
  MAX_WAIT=60
  WAIT_COUNT=0

  while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if bunx supabase status -o env > /tmp/supabase-env-check.log 2>&1; then
      # Source the env vars
      set -a
      source /tmp/supabase-env-check.log 2>/dev/null || true
      set +a

      # Test API endpoint
      if [ -n "$PUBLISHABLE_KEY" ]; then
        if curl -s -f -H "apikey: $PUBLISHABLE_KEY" \
           "http://127.0.0.1:54321/rest/v1/" > /dev/null 2>&1; then
          if curl -s -f "http://127.0.0.1:54321/auth/v1/health" > /dev/null 2>&1; then
            echo "✅ Supabase is ready"
            return 0
          fi
        fi
      fi
    fi

    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $((WAIT_COUNT % 5)) -eq 0 ]; then
      echo "   Still waiting... ($WAIT_COUNT/$MAX_WAIT seconds)"
    fi
  done

  echo "❌ Supabase failed to become ready after $MAX_WAIT seconds"
  echo "   Check status: bun run supabase:status"
  return 1
}

# Check if Supabase is already running
if check_supabase_running; then
  echo "✅ Supabase is already running"
else
  echo "📦 Starting Supabase..."

  # Check Docker
  if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker not found. Install Docker Desktop:"
    echo "   https://www.docker.com/products/docker-desktop"
    exit 1
  fi

  if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker Desktop."
    exit 1
  fi

  # Start Supabase (this is blocking and waits for services to be ready)
  if bunx supabase start 2>&1 | tee /tmp/supabase-start.log; then
    echo "✅ Supabase started"
  else
    # Check if it's already running (sometimes start fails if already running)
    if grep -q "already running" /tmp/supabase-start.log 2>/dev/null; then
      echo "ℹ️  Supabase is already running"
    else
      echo "❌ Failed to start Supabase"
      echo "   Check logs above for details"
      exit 1
    fi
  fi

  # Wait for Supabase to be fully ready
  if ! wait_for_supabase; then
    exit 1
  fi

  # Automatically seed database if empty (idempotent - safe to run multiple times)
  echo ""
  echo "🌱 Seeding database with test data..."
  # Seed script loads Supabase env vars itself, but use doppler for auth-related env vars
  if doppler run -- bun run seed > /tmp/seed-output.log 2>&1; then
    echo "✅ Database seeded successfully"
  else
    echo "⚠️  Database seeding had issues (this is OK if data already exists)"
  fi
fi

# Load Supabase environment variables before starting dev server
echo ""
echo "🔐 Checking Supabase TLS certificates..."
# Generate certificates using mkcert if they don't exist (for HTTPS/TLS support)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/setup-supabase-certs.sh" || {
  echo "⚠️  Warning: Failed to setup certificates. HTTPS may not work."
  echo "   Install mkcert: https://github.com/FiloSottile/mkcert"
}

echo ""
echo "📦 Loading Supabase environment variables..."
if bunx supabase status -o env > /tmp/supabase-env-final.log 2>&1; then
  # Source the env vars
  set -a
  source /tmp/supabase-env-final.log 2>/dev/null || true
  set +a

  # Map API_URL to SUPABASE_URL if needed
  if [ -n "$API_URL" ]; then
    export SUPABASE_LOCAL_URL="$API_URL"
    export SUPABASE_URL="$API_URL"
  fi

  # Map PUBLISHABLE_KEY to SUPABASE_PUBLISHABLE_KEY if needed
  if [ -n "$PUBLISHABLE_KEY" ]; then
    export SUPABASE_LOCAL_ANON_KEY="$PUBLISHABLE_KEY"
    export SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
  fi

  # Map SERVICE_ROLE_KEY if available
  if [ -n "$SERVICE_ROLE_KEY" ]; then
    export SUPABASE_LOCAL_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
    export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
  fi

  echo "✅ Supabase environment variables loaded"
else
  echo "⚠️  Warning: Could not load Supabase environment variables"
  echo "   Make sure Supabase is running: bun run supabase:status"
fi

# Start the development server
echo ""
echo "🚀 Starting development server..."
echo "   Server will be available at: http://localhost:3000"
echo ""
echo "📋 Quick Login (test users):"
echo "   • Admin:    $ADMIN_EMAIL / $ADMIN_PASSWORD"
echo "   • Manager:  $MANAGER_EMAIL / $MANAGER_PASSWORD"
echo "   • Member:   $MEMBER_EMAIL / $MEMBER_PASSWORD"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

# Run the dev command with doppler for environment injection (this will block)
# Doppler will inject env vars, and Supabase vars are already exported above
# Use NODE_ENV=development to ensure proper error messages
NODE_ENV=development exec doppler run -- bun --hot ProjectSourceCode/src/index.ts

