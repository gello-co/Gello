#!/bin/bash
set -e

echo "🔐 Initializing Doppler CLI..."

# Fetch Doppler token from gist
DOPPLER_TOKEN_URL="https://gist.githubusercontent.com/wistb/879ddbec01b9c6ebaa04bc1fd1630ad8/raw/4243bcc1fbe745dac8de96d4d7c05bd9b481f204/gello.doppler.gist"

echo "📥 Fetching Doppler token from gist..."
DOPPLER_TOKEN=$(curl -sLf "$DOPPLER_TOKEN_URL" | tr -d '\n\r ')

if [ -z "$DOPPLER_TOKEN" ]; then
  echo "❌ Failed to fetch Doppler token from $DOPPLER_TOKEN_URL"
  exit 1
fi

echo "✅ Doppler token retrieved"

# Authenticate Doppler with the token
echo "🔑 Authenticating Doppler..."
if echo "$DOPPLER_TOKEN" | doppler configure set token --silent; then
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
