# Gello Development Container
# Base image with common dev tools
FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    git \
    gnupg \
    jq \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 24 LTS via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Verify Node.js version
RUN node --version && npm --version

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash \
    && echo 'export PATH="$HOME/.bun/bin:$PATH"' >> /etc/profile.d/bun.sh \
    && chmod +x /etc/profile.d/bun.sh

# Add Bun to PATH for root and vscode user
ENV PATH="/root/.bun/bin:${PATH}"

# Install Doppler CLI
RUN apt-get update && apt-get install -y apt-transport-https ca-certificates curl gnupg \
    && curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | gpg --dearmor | tee /etc/apt/keyrings/doppler.gpg > /dev/null \
    && echo "deb [signed-by=/etc/apt/keyrings/doppler.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | tee /etc/apt/sources.list.d/doppler-cli.list \
    && apt-get update && apt-get install -y doppler \
    && rm -rf /var/lib/apt/lists/*

# Verify Doppler CLI installation
RUN doppler --version

# Install Supabase CLI globally via npm
RUN npm install -g supabase

# Verify Supabase CLI installation
RUN supabase --version

# Set working directory
WORKDIR /workspace

# Ensure vscode user owns the workspace
RUN chown -R vscode:vscode /workspace || true

# Set default user (devcontainer will override if needed)
USER vscode

# Ensure Bun is in PATH for vscode user
RUN echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
