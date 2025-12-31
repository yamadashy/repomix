# ==============================================================================
# Base image
# ==============================================================================
FROM node:24-alpine AS builder

# Install git (required for GitHub-based npm dependencies)
RUN apk add --no-cache git

WORKDIR /app
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ==============================================================================
# Production dependencies
# ==============================================================================
FROM node:24-alpine AS deps

# Install git (required for GitHub-based npm dependencies)
RUN apk add --no-cache git

WORKDIR /app
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# ==============================================================================
# Runtime image
# ==============================================================================
FROM node:24-alpine

# Install git and ca-certificates (required by repomix for remote repository processing)
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production \
    PORT=8080

# Expose port
EXPOSE 8080

# Start the server directly
CMD ["node", "dist/index.js"]
