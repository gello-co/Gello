#!/bin/bash
set -e

echo "🔐 Initializing Doppler CLI..."

# Check if token is provided via environment variable first
if [ -z "$DOPPLER_TOKEN" ]; then
  # If not in env, prompt user interactively
  echo "📥 Doppler token not found in DOPPLER_TOKEN environment variable"
  echo "   Please provide your Doppler token:"
  read -s -p "   Doppler Token: " DOPPLER_TOKEN
  echo ""
  
  if [ -z "$DOPPLER_TOKEN" ]; then
    echo "❌ Doppler token is required"
    echo ""
    echo "   To set the token:"
    echo "   1. Export DOPPLER_TOKEN environment variable, or"
    echo "   2. Run this script interactively and paste the token when prompted"
    echo ""
    echo "   For CI/CD, use OIDC: doppler oidc login"
    exit 1
  fi
else
  echo "✅ Doppler token found in environment variable"
fi

# Authenticate Doppler with the token (scoped to current directory, not global)
# Note: For CI/CD, prefer OIDC (doppler oidc login) for short-lived credentials when supported
echo "🔑 Authenticating Doppler..."
if echo "$DOPPLER_TOKEN" | doppler configure set token --scope . --silent; then
  echo "✅ Doppler authenticated successfully"
else
  echo "❌ Failed to authenticate Doppler"
  exit 1
fi

# Verify authentication
if doppler me &> /dev/null; then
  echo "✅ Doppler authentication verified"
else
  echo "⚠️  Doppler authentication verification failed (may still work)"
fi
