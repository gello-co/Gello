# Gello Development Container
# Base image with common dev tools
ARG BASE_IMAGE
FROM ${BASE_IMAGE:-mcr.microsoft.com/devcontainers/base:ubuntu}

# Install system dependencies and tools in one layer for better caching
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    default-jre \
    curl \
    wget \
    ca-certificates \
    apt-transport-https \
    gnupg \
    lsof \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install Bun (system-wide to /usr/local/bin)
# bunx is included with Bun installation
RUN curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash && \
    bun --version

# Install mise system-wide via official installation script
# Note: mise does not have an official apt/PPA package, so using official install script
# Errors will surface if installation fails (no || true)
RUN curl https://mise.run | sh && \
    /root/.local/bin/mise --version

# Install oh-my-zsh for vscode user (optional - fails gracefully if network issues occur)
RUN mkdir -p /home/vscode && \
    chown -R vscode:vscode /home/vscode && \
    su vscode -c 'sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended' || echo "Warning: oh-my-zsh installation failed (optional, continuing...)"

# Install Doppler CLI (using official method from https://docs.doppler.com/docs/dockerfile)
RUN curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | tee /etc/apt/sources.list.d/doppler-cli.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends doppler && \
    doppler --version && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Install Homebrew (for mkcert installation on Linux)
# See: https://docs.brew.sh/Homebrew-on-Linux
RUN /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" && \
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> /root/.bashrc && \
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)" && \
    brew --version

# Install mkcert for locally-trusted TLS certificates
# See: https://github.com/FiloSottile/mkcert
# Also add Homebrew to vscode user's shell configs for consistency
RUN eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)" && \
    brew install mkcert && \
    mkcert -version && \
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> /home/vscode/.bashrc && \
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> /home/vscode/.zshrc 2>/dev/null || true

# Set working directory
WORKDIR /workspace

# Set up git (will be overridden by devcontainer user setup)
RUN git config --global --add safe.directory /workspace
