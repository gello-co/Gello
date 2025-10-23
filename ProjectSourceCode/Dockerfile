# syntax=docker/dockerfile:1.7
# Multi-stage Bun build for Gello

FROM oven/bun:1 AS deps
WORKDIR /app

# Install deps (cache-friendly)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN bun run build

# --- Production runtime ---
FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=development
# ENV NODE_ENV=production --- IGNORE ---

# Copy only necessary files to run
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/dist ./dist
COPY --from=deps /app/src ./src
COPY --from=deps /app/package.json ./package.json

EXPOSE 3000

# Start the server (serves dist in production)
CMD ["bun", "run", "start"]
