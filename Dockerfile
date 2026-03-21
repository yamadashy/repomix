FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm via corepack (version from packageManager field in package.json)
RUN corepack enable

RUN mkdir /repomix
WORKDIR /repomix

# Install dependencies and build repomix, then link the package to the global scope
# To reduce the size of the layer, all steps are executed in the same RUN command
COPY . .
RUN pnpm install --frozen-lockfile \
    && pnpm run build \
    && pnpm link --global \
    && pnpm prune --prod \
    && pnpm store prune

WORKDIR /app

# Check the operation of repomix
RUN repomix --version
RUN repomix --help

ENTRYPOINT ["repomix"]
