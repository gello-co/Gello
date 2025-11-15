#!/bin/bash
# Restart development environment: Stop everything, then start again
# This script provides a clean restart of all development services

set -e

cd "$(dirname "$0")/.."

# Parse command-line arguments
DELAY_SECONDS="${STOP_TO_START_DELAY:-2}"
USE_POLLING=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --delay)
      DELAY_SECONDS="$2"
      shift 2
      ;;
    --poll)
      USE_POLLING=true
      shift
      ;;
    --help)
      echo "Usage: $0 [--delay SECONDS] [--poll]"
      echo ""
      echo "Options:"
      echo "  --delay SECONDS    Wait SECONDS before starting (default: 2, or STOP_TO_START_DELAY env var)"
      echo "  --poll             Poll service ports until they're available (with timeout)"
      echo ""
      echo "Environment variables:"
      echo "  STOP_TO_START_DELAY    Default delay in seconds (default: 2)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Validate delay is a non-negative number
if ! [[ "$DELAY_SECONDS" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
  echo "❌ Error: Delay must be a number, got: $DELAY_SECONDS"
  exit 1
fi

echo "🔄 Restarting Gello development environment..."
echo ""

# Function to check if a port is available (not in use)
check_port_available() {
  local port=$1
  if command -v lsof &> /dev/null; then
    ! lsof -ti:$port > /dev/null 2>&1
  elif command -v netstat &> /dev/null; then
    ! netstat -tuln 2>/dev/null | grep -q ":$port " 2>/dev/null
  else
    # Fallback: try to connect to the port (if connection fails, port is available)
    ! timeout 1 bash -c "echo > /dev/tcp/localhost/$port" 2>/dev/null
  fi
}

# Function to check if Supabase is stopped
check_supabase_stopped() {
  ! bunx supabase status > /dev/null 2>&1
}

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

if [ "$USE_POLLING" = true ]; then
  # Poll until services are stopped (with timeout)
  MAX_WAIT=30
  WAIT_COUNT=0
  SERVICES_STOPPED=false

  while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if check_port_available 3000 && check_supabase_stopped; then
      SERVICES_STOPPED=true
      break
    fi
    sleep 0.5
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $((WAIT_COUNT % 4)) -eq 0 ]; then
      echo "   Still waiting for services to stop... ($WAIT_COUNT/$MAX_WAIT seconds)"
    fi
  done

  if [ "$SERVICES_STOPPED" = true ]; then
    echo "✅ Services stopped"
  else
    echo "⚠️  Services may not be fully stopped (timeout after ${MAX_WAIT}s), continuing anyway..."
  fi
else
  # Use configured delay
  if [ "$DELAY_SECONDS" != "0" ]; then
    sleep "$DELAY_SECONDS"
  fi
fi

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

