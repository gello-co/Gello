#!/bin/bash
# Test login endpoint after server restart

set -e

# Server URL with default value
SERVER_URL="${SERVER_URL:-http://localhost:3000}"

echo "🧪 Testing login endpoint..."
echo ""

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
for i in {1..10}; do
  if curl -s "${SERVER_URL}/" > /dev/null 2>&1; then
    echo "✅ Server is ready"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "❌ Server not responding after 10 attempts"
    exit 1
  fi
  sleep 1
done

echo ""
echo "📝 Testing login with admin@example.com..."
RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed 's/HTTP_CODE:.*//')

echo "   HTTP Status: $HTTP_CODE"
echo "   Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "✅ Login successful!"
else
  echo ""
  echo "❌ Login failed (HTTP $HTTP_CODE)"
  exit 1
fi

