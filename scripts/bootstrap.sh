#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Gello Bootstrap - Starting local development environment"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function: Check if Supabase is running
check_supabase() {
  if bunx supabase status > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Supabase is running"
    return 0
  else
    return 1
  fi
}

# Function: Start Supabase if not running
start_supabase() {
  echo -e "${YELLOW}📦 Starting Supabase...${NC}"
  bunx supabase start
  echo -e "${GREEN}✓${NC} Supabase started"
}

# Function: Setup environment variables
setup_environment() {
  echo -e "${YELLOW}📝 Writing environment variables to ProjectSourceCode/.env.local...${NC}"

  # Get Supabase env vars and transform variable names to match app expectations
  # Supabase outputs: API_URL, ANON_KEY, PUBLISHABLE_KEY, SERVICE_ROLE_KEY
  # App expects: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY
  bunx supabase status -o env | sed \
    -e 's/^API_URL=/SUPABASE_URL=/' \
    -e 's/^ANON_KEY=/SUPABASE_ANON_KEY=/' \
    -e 's/^PUBLISHABLE_KEY=/SUPABASE_PUBLISHABLE_KEY=/' \
    -e 's/^SERVICE_ROLE_KEY=/SUPABASE_SERVICE_ROLE_KEY=/' \
    > ProjectSourceCode/.env.local

  # Add fallback environment variables
  echo "SESSION_SECRET=${SESSION_SECRET:-local-dev-secret-min-32-chars}" >> ProjectSourceCode/.env.local
  echo "NODE_ENV=${NODE_ENV:-development}" >> ProjectSourceCode/.env.local

  echo -e "${GREEN}✓${NC} Environment variables ready"
}

# Function: Reset and seed database
reset_and_seed() {
  echo -e "${YELLOW}🗄️  Resetting database...${NC}"
  bunx supabase db reset --no-seed
  echo -e "${YELLOW}🌱 Seeding test data...${NC}"
  cd ProjectSourceCode && bun ../scripts/seed-simple.ts
  cd ..  # Return to root directory for subsequent functions
  echo -e "${GREEN}✓${NC} Database ready"
}

# Function: Start dev server
start_dev_server() {
  echo -e "${YELLOW}🔥 Starting development server...${NC}"
  echo -e "${GREEN}✓${NC} Server running at http://localhost:3000"
  echo ""
  echo "Test accounts:"
  echo "  • admin@test.com / password123 (Admin)"
  echo "  • member@test.com / password123 (Member)"
  echo ""

  # Change to ProjectSourceCode directory so Bun can find .env.local
  # Bun looks for .env files in the directory containing package.json
  cd ProjectSourceCode

  # Start server with hot reload
  # INTEGRATION: Use Doppler if available to inject shared dev secrets
  if command -v doppler >/dev/null 2>&1 && [ -f "../doppler.yaml" ]; then
    echo -e "${YELLOW}🔐 Doppler detected. Starting with secrets injection...${NC}"
    exec doppler run -- bun --hot src/index.ts
  else
    exec bun --hot src/index.ts
  fi
}

# Main execution
if ! check_supabase; then
  start_supabase
fi

# Setup environment variables before seeding (seed script needs them)
setup_environment

if [ "${RESET_DB:-false}" = "true" ]; then
  reset_and_seed
fi

start_dev_server
