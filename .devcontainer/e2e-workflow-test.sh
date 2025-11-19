#!/bin/bash
# E2E Workflow Test for Devcontainer
# Tests the complete developer workflow from container start to running app

set -e

echo "🧪 Gello Devcontainer E2E Workflow Test"
echo "========================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run test
run_test() {
  local test_name="$1"
  local test_command="$2"

  echo -n "Testing: $test_name... "

  if eval "$test_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
    return 1
  fi
}

echo "📦 Phase 1: Environment Setup"
echo "----------------------------"

# Test environment variables
run_test "NODE_ENV is set" "[ -n \"\$NODE_ENV\" ]"
run_test "ALLOW_TEST_BYPASS is enabled" "[ \"\$ALLOW_TEST_BYPASS\" = \"true\" ]"

# Test essential tools
run_test "Bun is installed" "bun --version"
run_test "Node.js is installed" "node --version"
run_test "Doppler is installed" "doppler --version"
run_test "Git LFS is installed" "git lfs version"

# Test Homebrew tools
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)" 2>/dev/null || true
run_test "Supabase CLI is installed" "supabase --version"
run_test "mkcert is installed" "mkcert -version"

echo ""
echo "🗄️  Phase 2: Database Setup"
echo "-------------------------"

# Start Supabase (if not already running)
echo "Starting Supabase..."
if ! supabase status > /dev/null 2>&1; then
  supabase start || {
    echo -e "${YELLOW}⚠️  Supabase start failed - may need Docker running${NC}"
  }
fi

run_test "Supabase is running" "supabase status"

# Check database connection
DB_URL=$(supabase status -o env | grep DATABASE_URL | cut -d'=' -f2)
run_test "Database URL is available" "[ -n \"\$DB_URL\" ]"

echo ""
echo "📝 Phase 3: Project Dependencies"
echo "-------------------------------"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  bun install
fi

run_test "node_modules exists" "[ -d \"node_modules\" ]"
run_test "Dependencies are valid" "bun pm verify"

echo ""
echo "🧪 Phase 4: Test Suite (with bypass mode)"
echo "----------------------------------------"

# Set test environment
export NODE_ENV=test
export ALLOW_TEST_BYPASS=true
export TEST_AUTH_SYNC_DELAY=100  # Fast for bypass mode

# Run template setup
echo "Setting up test database template..."
bun run test:setup-template || {
  echo -e "${YELLOW}⚠️  Template setup warning (continuing)${NC}"
}

# Run integration tests with bypass mode
echo "Running integration tests (with bypass)..."
if bun test tests/integration --timeout 60000 2>&1 | tee /tmp/test-output.log; then
  echo -e "${GREEN}✅ Integration tests PASSED${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ Integration tests FAILED${NC}"
  echo "Last 30 lines of test output:"
  tail -30 /tmp/test-output.log
  ((TESTS_FAILED++))
fi

# Count test results from output
INTEGRATION_PASS=$(grep -c "✓" /tmp/test-output.log 2>/dev/null || echo "0")
echo "  → $INTEGRATION_PASS integration test cases passed"

echo ""
echo "🌐 Phase 5: Development Server"
echo "-----------------------------"

# Seed database
echo "Seeding database..."
if bun run seed; then
  echo -e "${GREEN}✅ Database seeded${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}⚠️  Seeding warning (may be okay)${NC}"
fi

# Start dev server in background
echo "Starting development server..."
export NODE_ENV=development
bun run dev &
DEV_SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to be ready..."
sleep 5

# Test server is responding
if curl -f http://localhost:3000 > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Dev server is running${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ Dev server failed to start${NC}"
  ((TESTS_FAILED++))
fi

# Test API health endpoint
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ API health check passed${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}⚠️  API health endpoint not available${NC}"
fi

# Cleanup: Stop dev server
echo "Stopping dev server..."
kill $DEV_SERVER_PID 2>/dev/null || true
wait $DEV_SERVER_PID 2>/dev/null || true

echo ""
echo "📊 Test Summary"
echo "=============="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All workflow tests passed!${NC}"
  echo ""
  echo "✨ Devcontainer is fully operational!"
  echo ""
  echo "Next steps:"
  echo "  1. Run 'bun run dev' to start development"
  echo "  2. Open http://localhost:3000 in your browser"
  echo "  3. Login with admin@example.com / password123"
  echo ""
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  echo ""
  echo "Check the output above for details."
  echo "Common fixes:"
  echo "  - Ensure Docker is running"
  echo "  - Run 'bun run supabase:reset' to reset database"
  echo "  - Check .env configuration"
  echo ""
  exit 1
fi
