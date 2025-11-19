#!/bin/bash
# Test script to verify devcontainer functionality
# This simulates the complete developer workflow

set -e

echo "🧪 Testing Gello Devcontainer - Complete E2E Test"
echo "=================================================="
echo ""

# Test 1: Check essential tools are installed
echo "✅ Test 1: Verifying essential tools..."
bun --version || { echo "❌ Bun not found"; exit 1; }
node --version || { echo "❌ Node.js not found"; exit 1; }
doppler --version || { echo "❌ Doppler not found"; exit 1; }

# Test 2: Check Homebrew tools
echo "✅ Test 2: Verifying Homebrew tools..."
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)" 2>/dev/null || true
supabase --version > /dev/null 2>&1 || { echo "❌ Supabase CLI not found"; exit 1; }
mkcert -version > /dev/null 2>&1 || { echo "❌ mkcert not found"; exit 1; }

# Test 3: Check Docker socket access
echo "✅ Test 3: Verifying Docker socket access..."
docker ps > /dev/null 2>&1 || { echo "❌ Docker socket not accessible"; exit 1; }
docker compose version > /dev/null 2>&1 || { echo "❌ Docker Compose not accessible"; exit 1; }

# Test 4: Check workspace permissions
echo "✅ Test 4: Verifying workspace permissions..."
[ -w /workspace ] || { echo "❌ Workspace not writable"; exit 1; }

# Test 5: Check Git is properly configured
echo "✅ Test 5: Verifying Git setup..."
git lfs version > /dev/null 2>&1 || { echo "❌ Git LFS not installed"; exit 1; }

# Test 6: Verify npm global packages
echo "✅ Test 6: Verifying global npm packages..."
ncu --version > /dev/null 2>&1 || { echo "❌ npm-check-updates not found"; exit 1; }

echo ""
echo "🎉 All tests passed! Devcontainer is ready for development."
echo ""
echo "Next steps for developers:"
echo "  1. Run 'bun install' to install project dependencies"
echo "  2. Run 'bun run start' to start Supabase + dev server"
echo "  3. Open http://localhost:3000 in your browser"
echo ""
