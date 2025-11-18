#!/bin/bash
# Verify login flow works correctly
set -e

echo "🔐 Verifying Login Flow"
echo "======================="
echo ""

# Check if server is running
if ! curl -f -s http://localhost:3000 > /dev/null 2>&1; then
  echo "❌ Server is not running"
  echo "   Start with: bun run dev"
  exit 1
fi

echo "✅ Server is running"
echo ""

# Test login API
echo "Testing login API endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  -c /tmp/gello-cookies.txt)

if echo "$RESPONSE" | grep -q "user"; then
  echo "✅ Login API works"
else
  echo "❌ Login API failed"
  echo "Response: $RESPONSE"
  exit 1
fi

echo ""
echo "Testing authenticated pages..."

# Test boards page (should be accessible after login)
BOARDS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/gello-cookies.txt \
  http://localhost:3000/boards)

if [ "$BOARDS_STATUS" = "200" ]; then
  echo "✅ Boards page accessible (/boards)"
else
  echo "⚠️  Boards page returned status: $BOARDS_STATUS"
fi

# Test teams page
TEAMS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/gello-cookies.txt \
  http://localhost:3000/teams)

if [ "$TEAMS_STATUS" = "200" ]; then
  echo "✅ Teams page accessible (/teams)"
else
  echo "⚠️  Teams page returned status: $TEAMS_STATUS"
fi

# Test profile page
PROFILE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/gello-cookies.txt \
  http://localhost:3000/profile)

if [ "$PROFILE_STATUS" = "200" ]; then
  echo "✅ Profile page accessible (/profile)"
else
  echo "⚠️  Profile page returned status: $PROFILE_STATUS"
fi

# Test leaderboard page
LEADERBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -b /tmp/gello-cookies.txt \
  http://localhost:3000/leaderboard)

if [ "$LEADERBOARD_STATUS" = "200" ]; then
  echo "✅ Leaderboard page accessible (/leaderboard)"
else
  echo "⚠️  Leaderboard page returned status: $LEADERBOARD_STATUS"
fi

# Cleanup
rm -f /tmp/gello-cookies.txt

echo ""
echo "🎉 Login flow verification complete!"
echo ""
echo "To test manually:"
echo "  1. Open http://localhost:3000/login"
echo "  2. Login with: admin@example.com / password123"
echo "  3. Should redirect to /boards"
echo "  4. Navigate to /teams, /profile, /leaderboard"
echo ""
