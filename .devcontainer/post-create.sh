#!/bin/bash
set -e

echo "🚀 Setting up Gello development environment..."

# Initialize Doppler CLI (fetches token from gist)
bash .devcontainer/doppler-init.sh

# Verify tools are installed (should be in Dockerfile)
if ! command -v bun &> /dev/null; then
  echo "❌ Bun not found - should be installed in Dockerfile"
  exit 1
fi

if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found - should be installed in Dockerfile"
  exit 1
fi

echo "✅ All required tools are available"

# Install Playwright browsers
if [ ! -d "node_modules/@playwright" ]; then
  echo "📦 Installing Playwright browsers..."
  bunx playwright install --with-deps
fi

# Verify Docker is available
if ! command -v docker &> /dev/null; then
  echo "⚠️  Docker not found. Supabase local development requires Docker."
  echo "   Please ensure Docker is installed and running."
else
  echo "✅ Docker is available"
fi

# Install project dependencies
echo "📦 Installing project dependencies..."
bun install

# Check if Supabase is initialized
if [ ! -f "supabase/config.toml" ]; then
  echo "📦 Initializing Supabase..."
  bunx supabase init
fi

# Setup git hooks if .git directory exists
if [ -d ".git" ]; then
  echo "📦 Setting up git hooks..."
  bunx husky install || echo "⚠️  Husky not configured (this is OK if not using git hooks)"
fi

# Start Supabase (blocking - waits until ready per Supabase CLI docs)
echo "🚀 Starting Supabase local instance..."
if command -v docker &> /dev/null && docker info &> /dev/null; then
  # supabase start is blocking and waits until all services are ready
  if bunx supabase start 2>&1 | tee /tmp/supabase-start.log; then
    echo "✅ Supabase start command completed"
  else
    # Check if it's already running
    if grep -q "already running" /tmp/supabase-start.log 2>/dev/null; then
      echo "ℹ️  Supabase is already running"
    else
      echo "⚠️  Supabase start had issues - checking status..."
      bunx supabase status
    fi
  fi
  
  # Verify Supabase is actually ready with a simple test
  echo "🔍 Verifying Supabase is ready..."
  MAX_VERIFY=30
  VERIFY_COUNT=0
  SUPABASE_READY=false
  
  while [ $VERIFY_COUNT -lt $MAX_VERIFY ]; do
    # Get credentials
    if bunx supabase status -o env > /tmp/supabase-env.log 2>&1; then
      # Source the env vars
      set -a
      source /tmp/supabase-env.log 2>/dev/null || true
      set +a
      
      # Test API endpoint with actual credentials
      if [ -n "$PUBLISHABLE_KEY" ]; then
        if curl -s -f -H "apikey: $PUBLISHABLE_KEY" \
           -H "Authorization: Bearer $PUBLISHABLE_KEY" \
           "http://127.0.0.1:54321/rest/v1/" > /dev/null 2>&1; then
          # Test auth endpoint
          if curl -s -f "http://127.0.0.1:54321/auth/v1/health" > /dev/null 2>&1; then
            echo "✅ Supabase is running and fully ready"
            SUPABASE_READY=true
            break
          fi
        fi
      fi
    fi
    
    sleep 1
    VERIFY_COUNT=$((VERIFY_COUNT + 1))
    if [ $((VERIFY_COUNT % 5)) -eq 0 ]; then
      echo "   Still verifying... ($VERIFY_COUNT/$MAX_VERIFY seconds)"
    fi
  done
  
  if [ "$SUPABASE_READY" = false ]; then
    echo "❌ Supabase verification failed after $MAX_VERIFY seconds"
    echo "   Check status: bun run supabase:status"
    exit 1
  fi
else
  echo "⚠️  Docker not available - Supabase cannot start"
  echo "   Start Supabase manually: bun run supabase:start"
  exit 1
fi

# Optional test verification (skip if VERIFY_ON_CREATE=false)
if [ "${VERIFY_ON_CREATE:-true}" != "false" ]; then
  echo ""
  echo "🧪 Running test verification..."
  echo ""

  # Wait a moment for Supabase to fully stabilize after verification
  echo "⏳ Waiting 3 seconds for Supabase to stabilize..."
  sleep 3

  # Run unit tests (excluding health tests - they're informational)
  if bun run test:unit -- --run --exclude tests/health.test.ts > /tmp/test-output.log 2>&1; then
    UNIT_TEST_COUNT=$(grep -E "Test Files|Tests" /tmp/test-output.log | tail -2)
    echo "✅ Unit tests passed"
    echo "   $UNIT_TEST_COUNT"
  else
    echo "❌ Unit tests failed - see /tmp/test-output.log for details"
    cat /tmp/test-output.log | tail -20
    echo ""
    echo "   To skip test verification on container creation, set VERIFY_ON_CREATE=false"
    exit 1
  fi

  # Run integration tests (these are the critical tests that must pass)
  echo ""
  echo "🔍 Running integration tests..."
  if timeout 180 bun run test:integration -- --run > /tmp/integration-test-output.log 2>&1; then
    INTEGRATION_TEST_COUNT=$(grep -E "Test Files|Tests" /tmp/integration-test-output.log | tail -2)
    echo "✅ Integration tests passed"
    echo "   $INTEGRATION_TEST_COUNT"
  else
    INTEGRATION_EXIT_CODE=$?
    if [ $INTEGRATION_EXIT_CODE -eq 124 ]; then
      echo "❌ Integration tests timed out after 3 minutes"
    else
      echo "❌ Integration tests failed"
    fi
    cat /tmp/integration-test-output.log | tail -30
    echo ""
    echo "   Setup cannot complete - integration tests must pass"
    echo "   Check Supabase: bun run supabase:status"
    echo "   Retry: bun run test:integration -- --run"
    echo "   To skip test verification on container creation, set VERIFY_ON_CREATE=false"
    exit 1
  fi
else
  echo ""
  echo "⏭️  Skipping test verification (VERIFY_ON_CREATE=false)"
  echo "   Run tests manually: bun run test:unit && bun run test:integration"
fi

echo ""
echo "✅ Development environment setup complete and verified!"
echo ""
echo "Quick start commands:"
echo "  • Run all tests: bun run test:integration && bun run test:unit"
echo "  • Start dev server: bun run dev"
echo "  • Check Supabase: bun run supabase:status"
echo "  • Reset database: bun run supabase:reset"
