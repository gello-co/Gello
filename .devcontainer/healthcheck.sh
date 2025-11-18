#!/bin/bash
# healthcheck.sh - Utility script for monitoring service health
# Purpose: Check Supabase and app server status
set -e

# Colors for output (only if terminal supports it)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  NC='\033[0m' # No Color
else
  GREEN=''
  RED=''
  YELLOW=''
  NC=''
fi

echo "🏥 Running health checks..."
echo ""

EXIT_CODE=0

# 1. Check Supabase API health
echo "🔍 Checking Supabase API (http://localhost:54321/health)..."
if curl -f -s -o /dev/null -w "%{http_code}" http://localhost:54321/health | grep -q "200"; then
  echo -e "${GREEN}✅ Supabase API is healthy${NC}"
else
  echo -e "${RED}❌ Supabase API is not responding${NC}"
  echo "   Run: bun run supabase:start"
  EXIT_CODE=1
fi

# 2. Check PostgreSQL connectivity
echo ""
echo "🔍 Checking PostgreSQL (port 54322)..."
if command -v pg_isready &> /dev/null; then
  if pg_isready -h localhost -p 54322 -U postgres &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL is accepting connections${NC}"
  else
    echo -e "${RED}❌ PostgreSQL is not ready${NC}"
    echo "   Check: bun run supabase:status"
    EXIT_CODE=1
  fi
else
  # Fallback to netcat if pg_isready is not available
  if command -v nc &> /dev/null; then
    if nc -z localhost 54322 2>/dev/null; then
      echo -e "${GREEN}✅ PostgreSQL port is open${NC}"
    else
      echo -e "${RED}❌ PostgreSQL port is not accessible${NC}"
      EXIT_CODE=1
    fi
  else
    echo -e "${YELLOW}⚠️  Cannot check PostgreSQL (pg_isready not found)${NC}"
  fi
fi

# 3. Check Supabase Auth endpoint
echo ""
echo "🔍 Checking Supabase Auth (http://localhost:54321/auth/v1/health)..."
if curl -f -s http://localhost:54321/auth/v1/health &> /dev/null; then
  echo -e "${GREEN}✅ Supabase Auth is healthy${NC}"
else
  echo -e "${YELLOW}⚠️  Supabase Auth endpoint not responding${NC}"
fi

# 4. Optional: Check app server (if running)
echo ""
echo "🔍 Checking App Server (http://localhost:3000/health)..."
if curl -f -s -o /dev/null http://localhost:3000/health 2>/dev/null; then
  echo -e "${GREEN}✅ App server is running${NC}"
else
  echo -e "${YELLOW}⚠️  App server is not running (this is OK if not started yet)${NC}"
  echo "   Start with: bun run dev"
fi

# 5. Check Supabase Studio
echo ""
echo "🔍 Checking Supabase Studio (http://localhost:54323)..."
if curl -f -s -o /dev/null http://localhost:54323 2>/dev/null; then
  echo -e "${GREEN}✅ Supabase Studio is accessible${NC}"
else
  echo -e "${YELLOW}⚠️  Supabase Studio is not responding${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All critical services are healthy${NC}"
else
  echo -e "${RED}❌ Some services need attention${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $EXIT_CODE
