#!/bin/bash
# on-create.sh - Runs ONCE after container is created
# Purpose: Lightweight first-run setup (heavy lifting is in post-create.sh)
set -e

echo "🔧 Running on-create setup..."

# 1. Set proper file permissions for workspace
echo "📂 Setting workspace permissions..."
sudo chown -R vscode:vscode /workspace 2>/dev/null || {
  echo "⚠️  Could not set workspace ownership (continuing anyway)"
}

# 2. Create cache directories for better performance
echo "📦 Creating cache directories..."
mkdir -p .bun-cache .cache logs
echo "✅ Cache directories created"

# 3. Check git config and prompt user if not set
if ! git config --global user.name &> /dev/null; then
  echo ""
  echo "⚠️  Git user.name not configured"
  echo "   Run: git config --global user.name \"Your Name\""
  echo "   Run: git config --global user.email \"your.email@example.com\""
  echo ""
fi

# 4. Initialize Doppler if DOPPLER_TOKEN is available in environment
if [ -n "$DOPPLER_TOKEN" ]; then
  echo "🔐 DOPPLER_TOKEN found in environment"
  echo "   Doppler will be initialized in post-create.sh"
else
  echo "ℹ️  DOPPLER_TOKEN not found in environment"
  echo "   Doppler setup will prompt for token during post-create.sh"
fi

# 5. Verify Homebrew is in PATH (for tools like mkcert, supabase CLI)
if ! command -v brew &> /dev/null; then
  if [ -f "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
    echo "📦 Adding Homebrew to PATH..."
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)" 2>/dev/null || true
    echo "✅ Homebrew available"
  else
    echo "⚠️  Homebrew not found (should be in Dockerfile)"
  fi
else
  echo "✅ Homebrew is available"
fi

echo ""
echo "✅ On-create setup complete"
echo "   Post-create.sh will handle dependency installation and full setup"
