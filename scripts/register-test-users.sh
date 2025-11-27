#!/usr/bin/env bash
# Register test users for local development
# Run after: bun run start (or bunx supabase start)

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "Registering test users at $BASE_URL..."

# Dev user (standard member)
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.local","password":"password123","passwordConfirm":"password123","display_name":"Dev User"}' \
  | jq -r '"✓ Registered: " + .user.email' 2>/dev/null || echo "⚠ dev@test.local may already exist"

# Admin user
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.local","password":"password123","passwordConfirm":"password123","display_name":"Admin User"}' \
  | jq -r '"✓ Registered: " + .user.email' 2>/dev/null || echo "⚠ admin@test.local may already exist"

echo ""
echo "Test credentials:"
echo "  Email: dev@test.local"
echo "  Password: password123"
echo ""
echo "Login at: $BASE_URL/login"
