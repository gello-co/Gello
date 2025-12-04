#!/usr/bin/env bash
# =============================================================================
# Developer Setup Verification Script
# =============================================================================
# This script checks that all required tools and configurations are in place
# for local development.
#
# Usage: ./scripts/verify-setup.sh
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall status
ERRORS=0
WARNINGS=0

# Helper functions
print_header() {
  echo ""
  echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
  ((WARNINGS++))
}

print_error() {
  echo -e "${RED}[FAIL]${NC} $1"
  ((ERRORS++))
}

print_info() {
  echo -e "       $1"
}

# =============================================================================
# Check: Required Tools
# =============================================================================
print_header "Required Tools"

# Bun
if command -v bun &>/dev/null; then
  BUN_VERSION=$(bun --version)
  print_success "Bun installed (v${BUN_VERSION})"
else
  print_error "Bun not installed"
  print_info "Install from: https://bun.sh/"
fi

# Docker
if command -v docker &>/dev/null; then
  if docker info &>/dev/null; then
    print_success "Docker installed and running"
  else
    print_warning "Docker installed but not running"
    print_info "Start Docker Desktop or run: sudo systemctl start docker"
  fi
else
  print_error "Docker not installed"
  print_info "Install from: https://docker.com/"
fi

# Git
if command -v git &>/dev/null; then
  print_success "Git installed"
else
  print_error "Git not installed"
fi

# =============================================================================
# Check: Optional Tools
# =============================================================================
print_header "Optional Tools"

# Doppler CLI
if command -v doppler &>/dev/null; then
  DOPPLER_VERSION=$(doppler --version 2>&1 | head -n1)
  print_success "Doppler CLI installed (${DOPPLER_VERSION})"

  # Check Doppler authentication
  if doppler whoami &>/dev/null; then
    DOPPLER_USER=$(doppler whoami --json 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    print_success "Doppler authenticated as: ${DOPPLER_USER}"

    # Check Doppler project access
    if doppler secrets --only-names &>/dev/null; then
      SECRET_COUNT=$(doppler secrets --only-names 2>/dev/null | wc -l)
      print_success "Doppler project access verified (${SECRET_COUNT} secrets available)"
    else
      print_warning "Doppler project not configured"
      print_info "Run: doppler setup"
    fi
  else
    print_warning "Doppler not authenticated"
    print_info "Run: doppler login"
  fi
else
  print_warning "Doppler CLI not installed (optional)"
  print_info "Install from: https://docs.doppler.com/docs/install-cli"
  print_info "Without Doppler, use: bun run dev:mock"
fi

# =============================================================================
# Check: Supabase CLI
# =============================================================================
print_header "Supabase"

# Check if supabase is available via bunx
if bunx supabase --version &>/dev/null; then
  SB_VERSION=$(bunx supabase --version 2>&1)
  print_success "Supabase CLI available (${SB_VERSION})"

  # Check if Supabase is running
  if bunx supabase status &>/dev/null; then
    print_success "Supabase local stack is running"

    # Show service URLs
    API_URL=$(bunx supabase status -o env 2>/dev/null | grep "API_URL" | cut -d'=' -f2 | tr -d '"' || echo "unknown")
    print_info "API: ${API_URL}"
    print_info "Studio: http://localhost:54323"
  else
    print_warning "Supabase local stack not running"
    print_info "Start with: bunx supabase start"
  fi
else
  print_error "Supabase CLI not available"
  print_info "Run: bun install"
fi

# =============================================================================
# Check: Project Configuration
# =============================================================================
print_header "Project Configuration"

# Check node_modules
if [[ -d "node_modules" ]]; then
  print_success "Dependencies installed (node_modules exists)"
else
  print_error "Dependencies not installed"
  print_info "Run: bun install"
fi

# Check doppler.yaml
if [[ -f "doppler.yaml" ]]; then
  print_success "doppler.yaml configuration exists"
else
  print_warning "doppler.yaml not found"
fi

# Check supabase config
if [[ -f "supabase/config.toml" ]]; then
  print_success "supabase/config.toml exists"
else
  print_error "supabase/config.toml not found"
fi

# Check for migrations
MIGRATION_COUNT=$(find supabase/migrations -name "*.sql" 2>/dev/null | wc -l)
if [[ ${MIGRATION_COUNT} -gt 0 ]]; then
  print_success "Found ${MIGRATION_COUNT} migration file(s)"
else
  print_warning "No migration files found"
fi

# =============================================================================
# Check: Environment Variables
# =============================================================================
print_header "Environment Variables"

# Only check if Doppler is available and configured
if command -v doppler &>/dev/null && doppler secrets --only-names &>/dev/null; then
  REQUIRED_VARS=("SESSION_SECRET" "CSRF_SECRET")
  OPTIONAL_VARS=("SUPABASE_URL" "SUPABASE_ANON_KEY" "DATABASE_URL")

  for VAR in "${REQUIRED_VARS[@]}"; do
    if doppler secrets get "${VAR}" &>/dev/null; then
      print_success "${VAR} is set in Doppler"
    else
      print_error "${VAR} is not set in Doppler"
    fi
  done

  for VAR in "${OPTIONAL_VARS[@]}"; do
    if doppler secrets get "${VAR}" &>/dev/null; then
      print_success "${VAR} is set in Doppler"
    else
      print_info "${VAR} not set (will use local Supabase defaults)"
    fi
  done
else
  print_info "Skipping env var check (Doppler not configured)"
  print_info "Local Supabase provides default values via bootstrap.sh"
fi

# =============================================================================
# Summary
# =============================================================================
print_header "Summary"

if [[ ${ERRORS} -eq 0 ]] && [[ ${WARNINGS} -eq 0 ]]; then
  echo -e "${GREEN}All checks passed.${NC}"
  echo ""
  echo "Quick start commands:"
  echo "  bun run start       # Full setup with Supabase + Doppler"
  echo "  bun run dev:mock    # Mock mode (no external services)"
  echo ""
  exit 0
elif [[ ${ERRORS} -eq 0 ]]; then
  echo -e "${YELLOW}Setup complete with ${WARNINGS} warning(s).${NC}"
  echo "You can still develop, but some features may be limited."
  echo ""
  exit 0
else
  echo -e "${RED}Setup incomplete: ${ERRORS} error(s), ${WARNINGS} warning(s).${NC}"
  echo "Please fix the errors above before proceeding."
  echo ""
  exit 1
fi
