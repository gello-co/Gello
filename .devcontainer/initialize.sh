#!/bin/bash
# initialize.sh - Runs on HOST before container creation
# Purpose: Validate prerequisites and environment setup
set -e

echo "🔍 Pre-container initialization checks..."

# 1. Check if .env exists, create from .env.example if missing
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env created - please configure SUPABASE_ANON_KEY and other required variables"
  else
    echo "⚠️  .env.example not found - skipping .env creation"
  fi
else
  echo "✅ .env file exists"
fi

# 2. Validate SUPABASE_ANON_KEY is present in .env
if [ -f ".env" ]; then
  if grep -q "SUPABASE_ANON_KEY=" .env && ! grep -q "SUPABASE_ANON_KEY=$" .env && ! grep -q "SUPABASE_ANON_KEY=\"\"" .env; then
    echo "✅ SUPABASE_ANON_KEY configured in .env"
  else
    echo "⚠️  SUPABASE_ANON_KEY not set in .env"
    echo "   This will be generated when Supabase starts for the first time"
  fi
fi

# 3. Verify Docker is running (critical for devcontainer)
if command -v docker &> /dev/null; then
  if docker info &> /dev/null 2>&1; then
    echo "✅ Docker is running"
  else
    echo "❌ Docker is installed but not running"
    echo "   Please start Docker Desktop and try again"
    exit 1
  fi
else
  echo "❌ Docker is not installed"
  echo "   Docker is required for devcontainer development"
  echo "   Install from: https://www.docker.com/products/docker-desktop"
  exit 1
fi

# 4. Check Docker Compose availability (required for Supabase)
if docker compose version &> /dev/null 2>&1; then
  echo "✅ Docker Compose is available"
elif command -v docker-compose &> /dev/null; then
  echo "✅ Docker Compose (legacy) is available"
else
  echo "⚠️  Docker Compose not found (required for Supabase)"
  echo "   Install: docker compose or docker-compose"
fi

echo ""
echo "✅ Pre-container checks complete - ready to build container"
