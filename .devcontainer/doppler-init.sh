#!/bin/bash
set -e

# Doppler initialization script
# Fetches service token from GitHub gist and configures Doppler CLI

DOPPLER_GIST_URL="https://gist.githubusercontent.com/wistb/879ddbec01b9c6ebaa04bc1fd1630ad8/raw/4243bcc1fbe745dac8de96d4d7c05bd9b481f204/gello.doppler.gist"
DOPPLER_TOKEN_FILE="/workspace/.doppler-token"
DOPPLER_ENV_FILE="/workspace/.doppler-env"

echo "🔐 Initializing Doppler CLI..."

# Fetch Doppler service token from gist
if ! DOPPLER_TOKEN=$(curl -fsSL "${DOPPLER_GIST_URL}" 2>/dev/null | tr -d '\n\r '); then
    echo "⚠️  Failed to fetch Doppler token from gist"
    echo "   Continuing without Doppler (some commands may require manual Doppler setup)"
    exit 0
fi

# Validate token is not empty
if [ -z "${DOPPLER_TOKEN}" ]; then
    echo "⚠️  Doppler token is empty"
    echo "   Continuing without Doppler (some commands may require manual Doppler setup)"
    exit 0
fi

# Store token in file with restricted permissions
echo "${DOPPLER_TOKEN}" > "${DOPPLER_TOKEN_FILE}"
chmod 600 "${DOPPLER_TOKEN_FILE}"

# Export DOPPLER_TOKEN for current session
export DOPPLER_TOKEN="${DOPPLER_TOKEN}"

# Create shell init file for interactive sessions
cat > "${DOPPLER_ENV_FILE}" << 'EOF'
# Doppler environment setup
if [ -f /workspace/.doppler-token ]; then
    export DOPPLER_TOKEN=$(cat /workspace/.doppler-token)
fi
EOF
chmod 644 "${DOPPLER_ENV_FILE}"

# Add to profile.d for all new shells
sudo tee /etc/profile.d/doppler-token.sh > /dev/null << EOF
# Doppler token initialization
if [ -f /workspace/.doppler-token ]; then
    export DOPPLER_TOKEN=\$(cat /workspace/.doppler-token)
fi
EOF
sudo chmod 644 /etc/profile.d/doppler-token.sh

# Source it for current shell
source /etc/profile.d/doppler-token.sh

# Verify Doppler is configured
if doppler configure get token --plain > /dev/null 2>&1 || [ -n "${DOPPLER_TOKEN}" ]; then
    echo "✅ Doppler CLI configured successfully"
else
    echo "⚠️  Doppler token set but verification failed"
    echo "   Commands using 'doppler run' may still work with DOPPLER_TOKEN env var"
fi
