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
RUN curl -fsSL https://bun.sh/install | bash && \
    cp /root/.bun/bin/bun /usr/local/bin/bun && \
    [ -f /root/.bun/bin/bunx ] && cp /root/.bun/bin/bunx /usr/local/bin/bunx || true && \
    chmod +x /usr/local/bin/bun && \
    [ -f /usr/local/bin/bunx ] && chmod +x /usr/local/bin/bunx || true && \
    bun --version

# Install oh-my-zsh and mise for vscode user
RUN mkdir -p /home/vscode && \
    chown -R vscode:vscode /home/vscode && \
    su vscode -c 'sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended' || true && \
    su vscode -c 'curl https://mise.run | bash' || true

# Install Doppler CLI (using official method from https://docs.doppler.com/docs/dockerfile)
RUN curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | tee /etc/apt/sources.list.d/doppler-cli.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends doppler && \
    doppler --version && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Set working directory
WORKDIR /workspace

# Set up git (will be overridden by devcontainer user setup)
RUN git config --global --add safe.directory /workspace
