#!/bin/bash
# Stop development environment: Dev Server + Supabase
# This script stops all running development services

set -e

cd "$(dirname "$0")/.."

echo "🛑 Stopping Gello development environment..."

# Function to check if a process is running on a port
check_port() {
  local port=$1
  if command -v lsof &> /dev/null; then
    lsof -ti:$port > /dev/null 2>&1
  elif command -v netstat &> /dev/null; then
    netstat -tuln 2>/dev/null | grep -q ":$port " 2>/dev/null
  else
    # Fallback: try to connect to the port
    timeout 1 bash -c "echo > /dev/tcp/localhost/$port" 2>/dev/null
  fi
}

# Stop development server (port 3000)
if check_port 3000; then
  echo "🛑 Stopping development server (port 3000)..."
  if command -v lsof &> /dev/null; then
    PID=$(lsof -ti:3000 2>/dev/null || true)
    if [ -n "$PID" ]; then
      kill "$PID" 2>/dev/null || true
      # Wait for process to stop
      for _ in {1..10}; do
        if ! check_port 3000; then
          break
        fi
        sleep 0.5
      done
      # Force kill if still running
      if check_port 3000; then
        kill -9 "$PID" 2>/dev/null || true
      fi
    fi
  else
    echo "   Note: Could not find process on port 3000 (lsof not available)"
    echo "   If server is running, press Ctrl+C in the terminal where it's running"
  fi
  echo "✅ Development server stopped"
else
  echo "ℹ️  Development server not running (port 3000)"
fi

# Stop Supabase
echo ""
echo "🛑 Stopping Supabase..."
if bunx supabase status > /dev/null 2>&1; then
  if bunx supabase stop; then
    echo "✅ Supabase stopped"
  else
    echo "⚠️  Supabase stop had issues, but continuing..."
  fi
else
  echo "ℹ️  Supabase not running"
fi

echo ""
echo "✅ All development services stopped"
echo ""
echo "To start again, run: bun run start"

