FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm via corepack (version from packageManager field in package.json)
RUN corepack enable

RUN mkdir /repomix
WORKDIR /repomix

# Copy workspace configuration for lockfile validation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY browser/package.json ./browser/
COPY scripts/memory/package.json ./scripts/memory/
COPY website/client/package.json ./website/client/
COPY website/server/package.json ./website/server/

# Install only root package dependencies
RUN pnpm install --frozen-lockfile --filter repomix

# Copy source and build
COPY src/ ./src/
COPY tsconfig.build.json tsconfig.json ./
COPY bin/ ./bin/
RUN pnpm run build \
    && npm link \
    && pnpm prune --prod \
    && pnpm store prune

WORKDIR /app

# Check the operation of repomix
RUN repomix --version
RUN repomix --help

ENTRYPOINT ["repomix"]
