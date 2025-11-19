#!/bin/bash
# Setup Supabase TLS certificates using mkcert
# mkcert creates locally-trusted certificates that browsers accept automatically
# See: https://github.com/FiloSottile/mkcert

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CERTS_DIR="$REPO_ROOT/supabase/certs"
CERT_FILE="$CERTS_DIR/local-test-cert.pem"
KEY_FILE="$CERTS_DIR/local-test-key.pem"

# Check if mkcert is installed
# Try standard PATH first, then check Homebrew location (for Linux/containers)
if ! command -v mkcert &> /dev/null; then
  # Check if Homebrew is installed and mkcert is there (common in devcontainers)
  if [ -f "/home/linuxbrew/.linuxbrew/bin/mkcert" ]; then
    # Add Homebrew to PATH if not already there
    if ! echo "$PATH" | grep -q "/home/linuxbrew/.linuxbrew/bin"; then
      eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)" 2>/dev/null || true
    fi
  fi
fi

# Check again after potential PATH update
if ! command -v mkcert &> /dev/null; then
  echo "⚠️  mkcert not found."
  echo ""
  echo "Install mkcert:"
  echo "  macOS:   brew install mkcert"
  echo "  Linux:   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  echo "           Then: brew install mkcert"
  echo "  Windows: choco install mkcert  (or scoop install mkcert)"
  echo ""
  echo "For more options, see: https://github.com/FiloSottile/mkcert#installation"
  echo ""
  echo "After installing, run this script again."
  exit 1
fi

# Create certs directory if it doesn't exist
mkdir -p "$CERTS_DIR"

# Check if certificates already exist
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  echo "✅ Supabase certificates already exist"
  exit 0
fi

# Install local CA if not already installed
CA_ROOT="$(mkcert -CAROOT 2>/dev/null || echo "")"
if [ -z "$CA_ROOT" ] || [ ! -d "$CA_ROOT" ] || [ ! -f "$CA_ROOT/rootCA.pem" ] || [ ! -f "$CA_ROOT/rootCA-key.pem" ]; then
  echo "🔐 Installing mkcert local CA (one-time setup)..."
  mkcert -install
  echo "✅ Local CA installed in system trust store"
fi

echo "🔐 Generating locally-trusted certificates for Supabase..."

# Generate certificate for localhost and 127.0.0.1
# mkcert automatically creates trusted certificates
cd "$CERTS_DIR"
mkcert -key-file local-test-key.pem -cert-file local-test-cert.pem \
  localhost 127.0.0.1 ::1

# Set appropriate permissions
chmod 644 "$CERT_FILE"
chmod 600 "$KEY_FILE"

echo "✅ Certificates generated successfully:"
echo "   Certificate: $CERT_FILE"
echo "   Private Key: $KEY_FILE"
echo ""
echo "ℹ️  These certificates are automatically trusted by browsers"
echo "   (no security warnings for localhost)"

