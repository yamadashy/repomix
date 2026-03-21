# ==============================================================================
# Base stage
# ==============================================================================
FROM node:24-alpine AS base

# Install Git (required for VitePress)
RUN apk add --no-cache git

WORKDIR /app

# ==============================================================================
# Dependencies installation stage
# ==============================================================================
FROM base AS deps

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (with npm cache optimization)
RUN npm ci && npm cache clean --force

# ==============================================================================
# Development stage
# ==============================================================================
FROM deps AS development

# Copy source code (exclude node_modules to avoid conflict with deps stage)
COPY --exclude=node_modules . .

EXPOSE 5173

CMD ["npm", "run", "docs:dev"]
