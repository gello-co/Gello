# syntax=docker/dockerfile:1.7
# Multi-stage Bun build for Gello (workspace at repo root)

FROM oven/bun:1.3.1 AS deps
WORKDIR /app

# Copy root workspace manifests and app manifest for dependency resolution
COPY package.json ./
COPY bun.lock* ./
## No sub-package manifest; single root package.json is the source of truth

# Install all dependencies for the workspace using the root lockfile
RUN bun install

# Copy the rest of the source and build the app
COPY . .
RUN bun run build

# --- Production runtime ---
FROM oven/bun:1.3.1 AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only what is needed and install production dependencies
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock* ./
RUN bun install --production

# App artifacts and sources needed at runtime
COPY --from=deps /app/ProjectSourceCode/dist ./ProjectSourceCode/dist
COPY --from=deps /app/ProjectSourceCode/src ./ProjectSourceCode/src

EXPOSE 3000

# Start the server using root script
CMD ["bun", "run", "start"]
