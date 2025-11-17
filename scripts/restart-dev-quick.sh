#!/bin/bash
# Quick restart script - just restarts the server (assumes Supabase is running)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🛑 Stopping existing server..."
pkill -f "bun.*index.ts" || true
pkill -f "bun.*test:server" || true
sleep 1

echo "📋 Loading environment variables..."
eval "$(bunx supabase status -o env)"

export SUPABASE_URL="$API_URL"
export SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export NODE_ENV="development"

echo "🚀 Starting server with hot reload..."
echo "   Server: http://localhost:3000"
echo ""

bun --hot ProjectSourceCode/src/index.ts

