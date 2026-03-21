# ==============================================================================
# Build stage (context = repository root)
# ==============================================================================
FROM node:24-alpine AS builder

# Install git (required by repomix for remote repository processing)
RUN apk add --no-cache git

# Enable pnpm via corepack (version from packageManager field in package.json)
RUN corepack enable

WORKDIR /app

# Copy workspace configuration and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Copy all workspace package.json files (required for lockfile validation)
COPY browser/package.json ./browser/
COPY scripts/memory/package.json ./scripts/memory/
COPY website/client/package.json ./website/client/
COPY website/server/package.json ./website/server/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build repomix (workspace dependency of server)
COPY src/ ./src/
COPY tsconfig.build.json ./
COPY bin/ ./bin/
RUN pnpm run build

# Copy server source and bundle
COPY website/server/ ./website/server/
RUN pnpm --filter repomix-website-server run bundle


# ==============================================================================
# Runtime image
# ==============================================================================
FROM node:24-alpine

# Install git and ca-certificates (required by repomix for remote repository processing)
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy bundled server and WASM files
COPY --from=builder /app/website/server/dist-bundled ./dist-bundled

# Copy external dependencies (cannot be bundled due to runtime requirements)
# - tinypool: spawns worker threads using file paths
# - tiktoken: loads WASM files dynamically at runtime
COPY --from=builder /app/node_modules/tinypool ./node_modules/tinypool
COPY --from=builder /app/node_modules/tiktoken ./node_modules/tiktoken

# Copy warmup script for compile cache generation
COPY --from=builder /app/website/server/warmup.mjs ./warmup.mjs

# Set environment variables for bundled mode
# NODE_COMPILE_CACHE enables V8 compile cache to reduce cold start latency
ENV NODE_ENV=production \
    PORT=8080 \
    REPOMIX_WORKER_PATH=/app/dist-bundled/worker.mjs \
    REPOMIX_WASM_DIR=/app/dist-bundled/wasm \
    NODE_COMPILE_CACHE=/app/.compile-cache

# Generate compile cache at build time
# This pre-compiles all modules so cold starts use cached compiled code
RUN node warmup.mjs

# Expose port
EXPOSE 8080

# Start the bundled server
CMD ["node", "dist-bundled/server.mjs"]
