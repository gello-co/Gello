#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Running health checks..."
echo ""

# Track failures
FAILED=0

# Check 1: Docker accessibility
echo -n "Checking Docker... "
if docker info >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker accessible"
else
    echo -e "${RED}✗${NC} Docker not accessible"
    echo "  💡 Fix: Ensure Docker Desktop is running and /var/run/docker.sock is mounted"
    FAILED=1
fi

# Check 2: Bun installation
echo -n "Checking Bun... "
if bun --version >/dev/null 2>&1; then
    BUN_VERSION=$(bun --version)
    echo -e "${GREEN}✓${NC} Bun installed (${BUN_VERSION})"
else
    echo -e "${RED}✗${NC} Bun not installed"
    echo "  💡 Fix: Run 'curl -fsSL https://bun.sh/install | bash'"
    FAILED=1
fi

# Check 3: Node modules
echo -n "Checking node_modules... "
if [ -d "node_modules" ] && [ "$(ls -A node_modules)" ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Dependencies not installed"
    echo "  💡 Run: bun install"
    FAILED=1
fi

# Check 4: Supabase CLI
echo -n "Checking Supabase CLI... "
if command -v supabase >/dev/null 2>&1; then
    SUPABASE_VERSION=$(supabase --version | head -n1)
    echo -e "${GREEN}✓${NC} Supabase CLI installed (${SUPABASE_VERSION})"
else
    echo -e "${RED}✗${NC} Supabase CLI not installed"
    echo "  💡 Fix: Should be installed in Dockerfile"
    FAILED=1
fi

# Check 5: Supabase running
echo -n "Checking Supabase services... "
if curl -s http://localhost:54321/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Supabase running"
else
    echo -e "${YELLOW}⚠${NC} Supabase not running"
    echo "  💡 Run: bun run supabase:start"
    # Don't fail on this - it's expected to not be running initially
fi

# Check 6: Port 3000 availability
echo -n "Checking port 3000... "
if lsof -i :3000 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} Port 3000 in use"
    echo "  💡 Run: lsof -ti:3000 | xargs kill -9"
else
    echo -e "${GREEN}✓${NC} Port 3000 available"
fi

# Check 7: Git configuration
echo -n "Checking Git... "
if git --version >/dev/null 2>&1; then
    GIT_VERSION=$(git --version)
    echo -e "${GREEN}✓${NC} Git installed (${GIT_VERSION})"
else
    echo -e "${RED}✗${NC} Git not installed"
    FAILED=1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All critical checks passed${NC}"
    echo ""
    echo "🚀 Ready to start development:"
    echo "   bun run start     # Start everything (Supabase + dev server)"
    echo "   bun run dev       # Start dev server only"
    exit 0
else
    echo -e "${RED}❌ Some checks failed${NC}"
    echo ""
    echo "Please fix the issues above before continuing."
    echo "For help, see: docs/dev/.devOps/setup.md"
    exit 1
fi
