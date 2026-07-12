# ============================================================
# RingSlot Backend — Production Dockerfile
# Multi-stage build for minimal image size
# ============================================================

# ── Stage 1: Builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build step)
RUN npm ci --ignore-scripts && npm cache clean --force

# Copy source code
COPY . .

# Run build step (currently a no-op, but supports future compilation)
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# ── Stage 2: Production ─────────────────────────────────────
FROM node:20-alpine AS production

# Security: add non-root user
RUN addgroup -g 1001 -S ringslot && \
    adduser -S ringslot -u 1001 -G ringslot

# Install curl for health checks and dumb-init for proper signal handling
RUN apk add --no-cache curl dumb-init

WORKDIR /app

# Copy production node_modules from builder
COPY --from=builder --chown=ringslot:ringslot /app/node_modules ./node_modules

# Copy application source
COPY --from=builder --chown=ringslot:ringslot /app/src ./src
COPY --from=builder --chown=ringslot:ringslot /app/package.json ./package.json

# Set environment
ENV NODE_ENV=production
ENV PORT=4000

# Switch to non-root user
USER ringslot

# Expose application port
EXPOSE 4000

# Health check — verify the API responds
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Use dumb-init to handle PID 1 and forward signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]
