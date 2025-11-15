#!/bin/bash
# Restart development environment: Stop everything, then start again
# This script provides a clean restart of all development services

set -e

cd "$(dirname "$0")/.."

echo "🔄 Restarting Gello development environment..."
echo ""

# Stop everything
if [ -f "scripts/stop-dev.sh" ]; then
  bash scripts/stop-dev.sh
else
  # Fallback: manual stop
  echo "🛑 Stopping services..."
  
  # Stop dev server on port 3000
  if command -v lsof &> /dev/null; then
    PID=$(lsof -ti:3000 2>/dev/null || true)
    if [ -n "$PID" ]; then
      kill $PID 2>/dev/null || true
      sleep 1
    fi
  fi
  
  # Stop Supabase
  if bunx supabase status > /dev/null 2>&1; then
    bunx supabase stop 2>/dev/null || true
  fi
fi

# Wait for services to fully stop
echo ""
echo "⏳ Waiting for services to stop..."
sleep 2

# Start everything
echo ""
echo "🚀 Starting services..."
if [ -f "scripts/start-dev.sh" ]; then
  exec bash scripts/start-dev.sh
else
  # Fallback: manual start
  bun run supabase:start
  sleep 3
  bun run dev
fi

