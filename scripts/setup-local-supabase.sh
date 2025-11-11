#!/bin/bash
# Setup script for local Supabase testing
# This script checks if Supabase is running locally and sets up environment

set -e

cd "$(dirname "$0")/.."

echo "Checking Supabase CLI installation..."
if ! bunx supabase --version &> /dev/null; then
  echo "Error: Supabase CLI not found. Install it with:"
  echo "  bunx supabase --version"
  echo "  or visit: https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "Checking Docker..."
if ! command -v docker &> /dev/null; then
  echo "Error: Docker not found. Install Docker Desktop:"
  echo "  https://www.docker.com/products/docker-desktop"
  exit 1
fi

echo "Starting local Supabase..."
bunx supabase start

echo ""
echo "Local Supabase is running!"
echo ""
echo "To get connection details, run:"
echo "  bun run supabase:status"
echo ""
echo "Or export environment variables:"
echo "  bun run supabase:env"
echo ""
echo "To stop local Supabase:"
echo "  bun run supabase:stop"

