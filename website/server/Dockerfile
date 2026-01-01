# ==============================================================================
# Build stage
# ==============================================================================
FROM node:24-alpine AS builder

# Install git (required for GitHub-based npm dependencies)
RUN apk add --no-cache git

WORKDIR /app
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Bundle the server with esbuild for unified worker support
RUN npx esbuild dist/index.js --bundle --platform=node --target=node20 \
    --format=esm --outfile=dist-bundled/server.mjs --external:tinypool \
    --banner:js="import { createRequire as _createRequire } from 'module'; const require = _createRequire(import.meta.url); import { fileURLToPath as _fileURLToPath } from 'url'; import { dirname as _dirname } from 'path'; const __filename = _fileURLToPath(import.meta.url); const __dirname = _dirname(__filename);"

# ==============================================================================
# Runtime image
# ==============================================================================
FROM node:24-alpine

# Install git and ca-certificates (required by repomix for remote repository processing)
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy bundled server
COPY --from=builder /app/dist-bundled ./dist-bundled

# Copy WASM files for tree-sitter (may be hoisted to root node_modules)
COPY --from=builder /app/node_modules/@repomix/tree-sitter-wasms/out/*.wasm ./wasm/

# Copy tinypool (external dependency)
COPY --from=builder /app/node_modules/tinypool ./node_modules/tinypool

# Set environment variables for bundled mode
ENV NODE_ENV=production \
    PORT=8080 \
    REPOMIX_WORKER_PATH=/app/dist-bundled/server.mjs \
    REPOMIX_WASM_DIR=/app/wasm

# Expose port
EXPOSE 8080

# Start the bundled server
CMD ["node", "dist-bundled/server.mjs"]
