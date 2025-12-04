# Gello Development Container - Simplified for devcontainer features compatibility
FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Container metadata
LABEL maintainer="Gello Development Team"
LABEL description="Gello development environment with Bun, Node.js, Supabase, and developer tools"
LABEL version="3.0"

# Set shell with pipefail for proper error handling in RUN commands
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install system dependencies in layers for better caching
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core utilities
    curl \
    wget \
    ca-certificates \
    gnupg \
    lsof \
    # Build tools
    build-essential \
    g++ \
    make \
    python3 \
    python3-pip \
    # Database clients
    postgresql-client \
    # Process monitoring
    procps \
    htop \
    # CLI utilities
    jq \
    tree \
    zip \
    unzip \
    # Git LFS
    git-lfs \
    # Java for Supabase
    default-jre \
    # Security tools
    libnss3-tools \
    apt-transport-https \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install Node.js LTS
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && node --version \
    && npm --version \
    && rm -rf /var/lib/apt/lists/*

# Install Bun (system-wide)
RUN curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash \
    && bun --version

# Install Homebrew as vscode user (required for mkcert and Supabase CLI)
USER vscode
# hadolint ignore=SC2016
RUN NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" \
    && echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.bashrc \
    && echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.zshrc

# Install brew packages (mkcert, supabase)
RUN eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)" \
    && brew install mkcert supabase/tap/supabase \
    && mkcert -install

# Switch back to root for remaining setup
USER root

# Install Doppler CLI
RUN curl -sLf --retry 3 --tlsv1.2 --proto "=https" \
    'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' \
    | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" \
    | tee /etc/apt/sources.list.d/doppler-cli.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends doppler \
    && doppler --version \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages with pinned versions
RUN npm install -g npm-check-updates@17 vercel@41 netlify-cli@19

# Add convenient aliases
RUN echo 'alias ll="ls -lah"' >> /etc/bash.bashrc \
    && echo 'alias gs="git status"' >> /etc/bash.bashrc \
    && echo 'alias dc="docker compose"' >> /etc/bash.bashrc \
    && echo 'alias sb="supabase"' >> /etc/bash.bashrc \
    && echo 'alias bt="bun test"' >> /etc/bash.bashrc \
    && echo 'alias bd="bun dev"' >> /etc/bash.bashrc

# Set up cache directories with proper permissions
RUN mkdir -p /home/vscode/.cache /home/vscode/.npm /home/vscode/.bun \
    && chown -R vscode:vscode /home/vscode/.cache /home/vscode/.npm /home/vscode/.bun

# Initialize Git LFS
RUN git lfs install

# Set working directory
WORKDIR /workspace

# Mark workspace as safe directory for git
RUN git config --global --add safe.directory /workspace

# Set default shell to zsh for vscode user
RUN chsh -s /bin/zsh vscode || true

# Add vscode user to docker group for socket access
RUN groupadd -f docker && usermod -aG docker vscode || true

# Switch to non-root user for security (CKV_DOCKER_8)
USER vscode

# Healthcheck to verify container is running properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
