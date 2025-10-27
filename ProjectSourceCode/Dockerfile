# syntax=docker/dockerfile:1.7
# Multi-stage Bun build for Gello (workspace at repo root)

FROM oven/bun:latest AS deps
WORKDIR /app

# Copy root workspace manifests and app manifest for dependency resolution
COPY package.json ./
COPY bun.lock* ./
COPY ProjectSourceCode/package.json ./ProjectSourceCode/package.json

# Install all dependencies for the workspace using the root lockfile
RUN bun install --frozen-lockfile

# Copy the rest of the source and build the app
COPY . .
RUN bun run --cwd ProjectSourceCode build

# --- Production runtime ---
FROM oven/bun:latest AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only what is needed and install production dependencies
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock* ./
COPY --from=deps /app/ProjectSourceCode/package.json ./ProjectSourceCode/package.json
RUN bun install --frozen-lockfile --production

# App artifacts and sources needed at runtime
COPY --from=deps /app/ProjectSourceCode/dist ./ProjectSourceCode/dist
COPY --from=deps /app/ProjectSourceCode/src ./ProjectSourceCode/src

EXPOSE 3000

# Start the server from the app workspace
CMD ["bun", "run", "--cwd", "ProjectSourceCode", "start"]
