# ==============================================================================
# Base stage
# ==============================================================================
FROM node:24-alpine AS base

# Install Git (required for VitePress) and enable pnpm via corepack
RUN apk add --no-cache git && corepack enable

WORKDIR /app

# ==============================================================================
# Development stage (used by docker compose)
# ==============================================================================
FROM base AS development

EXPOSE 5173

CMD ["pnpm", "run", "docs:dev"]
