#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Gello Bootstrap - Starting local development environment"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Store the project root for later reference
PROJECT_ROOT="$(pwd)"

# ============================================================================
# CLEAN ARCHITECTURE: Doppler + Local Supabase
# ============================================================================
# Sources of truth:
#   - Doppler (dev config): SESSION_SECRET, CSRF_SECRET, OAuth client IDs
#   - Local Supabase: DATABASE_URL, SUPABASE_URL, SUPABASE_*_KEY
#
# No .env files needed - everything is injected at runtime.
# ============================================================================

# Function: Check if Doppler is available (from project root)
check_doppler() {
  if command -v doppler >/dev/null 2>&1 && [ -f "${PROJECT_ROOT}/doppler.yaml" ]; then
    return 0
  else
    return 1
  fi
}

# Function: Export OAuth secrets for Supabase CLI
# Doppler uses SB_* prefix, Supabase CLI expects SUPABASE_AUTH_EXTERNAL_*
export_oauth_for_supabase() {
  if check_doppler; then
    echo -e "${YELLOW}🔑 Loading OAuth secrets from Doppler for Supabase...${NC}"

    # Export with SUPABASE_* prefix for Supabase CLI
    # Declare and assign separately to avoid masking return values (SC2155)
    local discord_client_id discord_secret github_client_id github_secret
    discord_client_id=$(doppler secrets get SB_AUTH_EXTERNAL_DISCORD_CLIENT_ID --plain 2>/dev/null || echo "")
    discord_secret=$(doppler secrets get SB_AUTH_EXTERNAL_DISCORD_SECRET --plain 2>/dev/null || echo "")
    github_client_id=$(doppler secrets get SB_AUTH_EXTERNAL_GITHUB_CLIENT_ID --plain 2>/dev/null || echo "")
    github_secret=$(doppler secrets get SB_AUTH_EXTERNAL_GITHUB_SECRET --plain 2>/dev/null || echo "")
    export SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID="$discord_client_id"
    export SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET="$discord_secret"
    export SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID="$github_client_id"
    export SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET="$github_secret"

    echo -e "${GREEN}✓${NC} OAuth secrets loaded"
  fi
}

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

# Function: Get local Supabase env vars and export them
export_supabase_env() {
  echo -e "${YELLOW}📝 Loading local Supabase environment...${NC}"

  # Parse supabase status output line by line
  while IFS='=' read -r key value; do
    # Remove surrounding quotes from value
    value="${value%\"}"
    value="${value#\"}"

    case "$key" in
      API_URL)
        export SUPABASE_URL="$value"
        ;;
      DB_URL)
        export DATABASE_URL="$value"
        ;;
      ANON_KEY)
        export SUPABASE_ANON_KEY="$value"
        ;;
      PUBLISHABLE_KEY)
        export SUPABASE_PUBLISHABLE_KEY="$value"
        ;;
      SERVICE_ROLE_KEY|SECRET_KEY)
        export SUPABASE_SERVICE_ROLE_KEY="$value"
        ;;
    esac
  done < <(bunx supabase status -o env 2>/dev/null)

  echo -e "${GREEN}✓${NC} Supabase environment loaded"
  echo -e "    Database: ${DATABASE_URL:-not set}"
  echo -e "    API URL:  ${SUPABASE_URL:-not set}"
}

# Function: Reset and seed database
reset_and_seed() {
  echo -e "${YELLOW}🗄️  Resetting database...${NC}"
  bunx supabase db reset
  echo -e "${GREEN}✓${NC} Database ready"
}

# Function: Start dev server
start_dev_server() {
  echo -e "${YELLOW}🔥 Starting development server...${NC}"
  echo ""
  echo -e "${GREEN}✓${NC} Server running at http://localhost:3000"
  echo ""
  echo "DEV_BYPASS_AUTH is enabled - auto-login as admin"
  echo ""

  # Change to ProjectSourceCode directory
  cd "${PROJECT_ROOT}/ProjectSourceCode"

  # Start server with hot reload
  if check_doppler; then
    echo -e "${YELLOW}🔐 Starting with Doppler secrets injection...${NC}"
    # Doppler injects SB_* secrets, local Supabase vars already exported
    exec doppler run --project gello --config dev -- bun --hot src/index.ts
  else
    echo -e "${YELLOW}⚠️  Doppler not available, using environment only${NC}"
    exec bun --hot src/index.ts
  fi
}

# ============================================================================
# Main execution
# ============================================================================

# Step 1: Export OAuth secrets before starting Supabase (needed for auth config)
export_oauth_for_supabase

# Step 2: Start Supabase if not running
if ! check_supabase; then
  start_supabase
fi

# Step 3: Load local Supabase env vars into current shell
export_supabase_env

# Step 4: Reset database if requested
if [ "${RESET_DB:-false}" = "true" ]; then
  reset_and_seed
fi

# Step 5: Start the dev server
start_dev_server
