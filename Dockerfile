FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@10.32.1

RUN mkdir /repomix
WORKDIR /repomix

# Install dependencies and build repomix, then link the package to the global scope
# To reduce the size of the layer, all steps are executed in the same RUN command
COPY . .
RUN pnpm install --frozen-lockfile \
    && pnpm run build \
    && npm link \
    && pnpm prune --prod \
    && pnpm store prune

WORKDIR /app

# Check the operation of repomix
RUN repomix --version
RUN repomix --help

ENTRYPOINT ["repomix"]
