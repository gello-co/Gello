#!/bin/bash
set -e

# Configuration flags
FULL_SETUP_ON_CREATE="${FULL_SETUP_ON_CREATE:-false}"
FULL_SETUP_METRICS="${FULL_SETUP_METRICS:-true}"

# Metrics tracking
METRICS_FILE="/tmp/devcontainer-full-setup-metrics.json"
START_TIME=$(date +%s)

# Helper function to display metrics summary
display_metrics_summary() {
  if [ ! -f "$METRICS_FILE" ]; then
    return 0
  fi

  echo ""
  echo "📊 Setup Metrics Summary:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Parse JSON and display metrics (using simple parsing since we control the format)
  local total_time=0
  local has_metrics=false

  while IFS= read -r line; do
    # Extract phase name and duration from JSON lines
    if echo "$line" | grep -q '"phase"'; then
      local phase
      phase=$(echo "$line" | sed -n 's/.*"phase":"\([^"]*\)".*/\1/p')
      local phase_duration
      phase_duration=$(echo "$line" | sed -n 's/.*"phase_duration_seconds":\([0-9]*\).*/\1/p')

      if [ -n "$phase" ] && [ -n "$phase_duration" ] && [ "$phase" != "total_full_setup" ]; then
        has_metrics=true
        # Format phase name for display (convert snake_case to Title Case)
        local display_name
        display_name=$(echo "$phase" | sed 's/_/ /g' | sed 's/\b\(.\)/\u\1/g')

        # Format duration (show seconds if < 60, otherwise minutes and seconds)
        if [ "$phase_duration" -lt 60 ]; then
          printf "  %-25s %3ds\n" "$display_name:" "$phase_duration"
        else
          local minutes=$((phase_duration / 60))
          local seconds=$((phase_duration % 60))
          printf "  %-25s %dm %ds\n" "$display_name:" "$minutes" "$seconds"
        fi

        # Track total from total_full_setup entry
        if [ "$phase" = "total_full_setup" ]; then
          total_time=$phase_duration
        fi
      elif [ "$phase" = "total_full_setup" ]; then
        total_time=$phase_duration
      fi
    fi
  done < "$METRICS_FILE"

  if [ "$has_metrics" = true ] || [ "$total_time" -gt 0 ]; then
    if [ "$total_time" -gt 0 ]; then
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      if [ "$total_time" -lt 60 ]; then
        printf "  %-25s %3ds\n" "Total Setup Time:" "$total_time"
      else
        local minutes=$((total_time / 60))
        local seconds=$((total_time % 60))
        printf "  %-25s %dm %ds\n" "Total Setup Time:" "$minutes" "$seconds"
      fi
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   Full metrics JSON: $METRICS_FILE"
  fi
}

# Helper function to record timing
record_time() {
  local phase=$1
  local phase_duration=$2
  local end_time
  end_time=$(date +%s)
  local cumulative_duration=$((end_time - START_TIME))

  if [ "$FULL_SETUP_METRICS" = "true" ]; then
    # Create JSON entry for this phase with both individual and cumulative times
    local json_entry
    json_entry="{\"phase\":\"$phase\",\"phase_duration_seconds\":$phase_duration,\"cumulative_duration_seconds\":$cumulative_duration,\"timestamp\":\"$(date -Iseconds)\"}"

    # Append to metrics file (create array if first entry)
    if [ ! -f "$METRICS_FILE" ]; then
      echo "[$json_entry" > "$METRICS_FILE"
    else
      echo ",$json_entry" >> "$METRICS_FILE"
    fi
  fi

  echo "⏱️  $phase completed in ${phase_duration}s (cumulative: ${cumulative_duration}s)"
}

echo "🚀 Setting up Gello development environment..."

# Initialize Doppler CLI (fetches token from gist)
bash .devcontainer/doppler-init.sh

# Verify tools are installed (should be in Dockerfile)
if ! command -v bun &> /dev/null; then
  echo "❌ Bun not found - should be installed in Dockerfile"
  exit 1
fi

# Verify bunx is available (Supabase CLI runs via bunx or bun x)
if command -v bunx &> /dev/null; then
  BUNX_CMD="bunx"
elif bun x --version &> /dev/null; then
  BUNX_CMD="bun x"
  echo "ℹ️  Using 'bun x' instead of 'bunx'"
else
  echo "❌ Neither bunx nor 'bun x' available - Bun installation may be incomplete"
  exit 1
fi

# Test Supabase CLI availability (non-blocking)
if ! $BUNX_CMD supabase --version &> /dev/null; then
  echo "⚠️  Supabase CLI not available via $BUNX_CMD (will be downloaded on first use)"
else
  echo "✅ Supabase CLI available via $BUNX_CMD"
fi

echo "✅ All required tools are available"

# Install project dependencies
echo "📦 Installing project dependencies..."
bun install

# Install Playwright browsers (only if needed, log version)
if [ ! -d "node_modules/@playwright" ]; then
  echo "📦 Installing Playwright browsers..."
  $BUNX_CMD playwright install --with-deps
  PLAYWRIGHT_VERSION=$($BUNX_CMD playwright --version 2>/dev/null || echo "unknown")
  echo "✅ Playwright browsers installed (version: $PLAYWRIGHT_VERSION)"
else
  PLAYWRIGHT_VERSION=$($BUNX_CMD playwright --version 2>/dev/null || echo "unknown")
  echo "✅ Playwright browsers already installed (version: $PLAYWRIGHT_VERSION)"
fi

# Verify Docker is available
if ! command -v docker &> /dev/null; then
  echo "⚠️  Docker not found. Supabase local development requires Docker."
  echo "   Please ensure Docker is installed and running."
else
  echo "✅ Docker is available"
fi

# Check if Supabase is initialized
if [ ! -f "supabase/config.toml" ]; then
  echo "📦 Initializing Supabase..."
  $BUNX_CMD supabase init
fi

# Setup git hooks if .git directory exists
# Husky v9+ uses prepare script in package.json, no install command needed
if [ -d ".git" ] && [ -d ".husky" ]; then
  echo "📦 Git hooks directory found (.husky)"
  echo "   Husky v9+ uses prepare script - no manual setup needed"
fi

# Fast setup complete - show summary
echo ""
echo "✅ Fast setup complete!"
echo ""
echo "📋 Configuration:"
echo "  • FULL_SETUP_ON_CREATE: ${FULL_SETUP_ON_CREATE}"
echo "  • FULL_SETUP_METRICS: ${FULL_SETUP_METRICS}"
echo ""

# Full setup (Supabase start + seed + tests) - only if flag is enabled
if [ "$FULL_SETUP_ON_CREATE" = "true" ]; then
  echo "🔧 Running full setup (Supabase + seeding + tests)..."
  FULL_SETUP_START=$(date +%s)

  # Start Supabase (blocking - waits until ready per Supabase CLI docs)
  echo "🚀 Starting Supabase local instance..."
  SUPABASE_START_TIME=$(date +%s)

  if command -v docker &> /dev/null && docker info &> /dev/null; then
    # supabase start is blocking and waits until all services are ready
    if $BUNX_CMD supabase start 2>&1 | tee /tmp/supabase-start.log; then
      echo "✅ Supabase start command completed"
    else
      # Check if it's already running
      if grep -q "already running" /tmp/supabase-start.log 2>/dev/null; then
        echo "ℹ️  Supabase is already running"
      else
        echo "⚠️  Supabase start had issues - checking status..."
        $BUNX_CMD supabase status
      fi
    fi

    # Verify Supabase is actually ready with a simple test
    echo "🔍 Verifying Supabase is ready..."
    MAX_VERIFY=30
    VERIFY_COUNT=0
    SUPABASE_READY=false

    while [ $VERIFY_COUNT -lt $MAX_VERIFY ]; do
      # Get credentials
      if $BUNX_CMD supabase status -o env > /tmp/supabase-env.log 2>&1; then
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

    SUPABASE_END_TIME=$(date +%s)
    SUPABASE_DURATION=$((SUPABASE_END_TIME - SUPABASE_START_TIME))
    if [ "$FULL_SETUP_METRICS" = "true" ]; then
      record_time "supabase_start" "$SUPABASE_DURATION"
    fi

    # Automatically seed database with test data
    echo ""
    echo "🌱 Seeding database with test data..."
    SEED_START_TIME=$(date +%s)
    # Use doppler for auth-related env vars injection
    if doppler run -- bun run seed > /tmp/seed-output.log 2>&1; then
      echo "✅ Database seeded successfully"
      SEED_END_TIME=$(date +%s)
      SEED_DURATION=$((SEED_END_TIME - SEED_START_TIME))
      if [ "$FULL_SETUP_METRICS" = "true" ]; then
        record_time "database_seed" "$SEED_DURATION"
      fi
    else
      echo "⚠️  Database seeding had issues (this is OK if data already exists)"
      cat /tmp/seed-output.log | tail -10
    fi

    # Run tests
    echo ""
    echo "🧪 Running test verification..."
    echo ""

    # Wait a moment for Supabase to fully stabilize after verification
    echo "⏳ Waiting 3 seconds for Supabase to stabilize..."
    sleep 3

    # Run unit tests (excluding health tests - they're informational)
    UNIT_START_TIME=$(date +%s)
    if timeout 180 bun run test:unit -- --run --exclude tests/health.test.ts > /tmp/test-output.log 2>&1; then
      UNIT_TEST_COUNT=$(grep -E "Test Files|Tests" /tmp/test-output.log | tail -2)
      echo "✅ Unit tests passed"
      echo "   $UNIT_TEST_COUNT"
      UNIT_END_TIME=$(date +%s)
      UNIT_DURATION=$((UNIT_END_TIME - UNIT_START_TIME))
      if [ "$FULL_SETUP_METRICS" = "true" ]; then
        record_time "unit_tests" "$UNIT_DURATION"
      fi
    else
      echo "❌ Unit tests failed - see /tmp/test-output.log for details"
      cat /tmp/test-output.log | tail -20
      echo ""
      echo "   To skip test verification on container creation, set FULL_SETUP_ON_CREATE=false"
      exit 1
    fi

    # Run integration tests (these are the critical tests that must pass)
    echo ""
    echo "🔍 Running integration tests..."
    INTEGRATION_START_TIME=$(date +%s)
    if timeout 180 bun run test:integration -- --run > /tmp/integration-test-output.log 2>&1; then
      INTEGRATION_TEST_COUNT=$(grep -E "Test Files|Tests" /tmp/integration-test-output.log | tail -2)
      echo "✅ Integration tests passed"
      echo "   $INTEGRATION_TEST_COUNT"
      INTEGRATION_END_TIME=$(date +%s)
      INTEGRATION_DURATION=$((INTEGRATION_END_TIME - INTEGRATION_START_TIME))
      if [ "$FULL_SETUP_METRICS" = "true" ]; then
        record_time "integration_tests" "$INTEGRATION_DURATION"
      fi
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
      echo "   To skip test verification on container creation, set FULL_SETUP_ON_CREATE=false"
      exit 1
    fi

    FULL_SETUP_END=$(date +%s)
    FULL_SETUP_DURATION=$((FULL_SETUP_END - FULL_SETUP_START))

    if [ "$FULL_SETUP_METRICS" = "true" ]; then
      # Close JSON array and add total time
      echo ",{\"phase\":\"total_full_setup\",\"phase_duration_seconds\":$FULL_SETUP_DURATION,\"cumulative_duration_seconds\":$FULL_SETUP_DURATION,\"timestamp\":\"$(date -Iseconds)\"}]" >> "$METRICS_FILE"
    fi
  else
    echo "⚠️  Docker not available - Supabase cannot start"
    echo "   Start Supabase manually: bun run supabase:start"
    exit 1
  fi
else
  echo "⏭️  Skipping full setup (FULL_SETUP_ON_CREATE=false)"
  echo "   Fast setup is the default. To enable full setup, set FULL_SETUP_ON_CREATE=true"
  echo "   Metrics are enabled by default. To disable, set FULL_SETUP_METRICS=false"
  
  # Always close metrics JSON if it was created (even in fast setup)
  if [ -f "$METRICS_FILE" ] && [ "$FULL_SETUP_METRICS" = "true" ]; then
    # Check if JSON array is already closed
    if ! grep -q '^\]' "$METRICS_FILE" 2>/dev/null; then
      # Close the JSON array
      echo "]" >> "$METRICS_FILE"
    fi
  fi
fi

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "Test User Credentials:"
echo "  Admin:    admin@example.com / password123"
echo "  Manager:  manager@example.com / password123"
echo "  Manager:  bob.manager@example.com / password123"
echo "  Member:   member@example.com / password123"
echo "  Member:   noah.member@example.com / password123"
echo ""
echo "🚀 Quick Start:"
echo "  1. Run: bun run start"
echo "  2. Open: http://localhost:3000"
echo "  3. Login with any test user above"
echo "  4. Navigate all pages!"
echo ""
echo "📚 Available Pages:"
echo "  • / (home)"
echo "  • /login (login page)"
echo "  • /register (register page)"
echo "  • /boards (requires auth - all roles)"
echo "  • /boards/:id (requires auth - all roles)"
echo "  • /teams (requires auth - all roles, admin sees all teams)"
echo "  • /teams/:id (requires auth - all roles)"
echo "  • /leaderboard (requires auth - all roles)"
echo "  • /profile (requires auth - all roles)"
echo ""
echo "🔧 Other Commands:"
echo "  • Run all tests: bun run test:integration && bun run test:unit"
echo "  • Check Supabase: bun run supabase:status"
echo "  • Reset database: bun run supabase:reset"
echo "  • Re-seed data: bun run seed"
echo ""
# Display metrics summary if available
display_metrics_summary
