# Multi-stage build for production optimization with enhanced security
FROM node:18-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates && \
    rm -rf /var/cache/apk/*

# Create app directory with proper permissions
WORKDIR /app

# Create non-root user early for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nestjs

# ================================
# Dependencies stage
# ================================
FROM base AS deps

# Copy package files for dependency installation
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies with security optimizations
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force && \
    # Remove unnecessary files to reduce image size
    find node_modules -name "*.md" -delete && \
    find node_modules -name "*.txt" -delete && \
    find node_modules -name "LICENSE*" -delete && \
    find node_modules -name "CHANGELOG*" -delete

# ================================
# Development dependencies stage
# ================================
FROM base AS dev-deps

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies)
RUN npm ci --no-audit --no-fund && \
    npm cache clean --force

# ================================
# Builder stage
# ================================
FROM base AS builder

WORKDIR /app

# Copy dev dependencies for building
COPY --from=dev-deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application with optimizations
RUN npm run build && \
    # Remove source maps in production for security
    find dist -name "*.map" -delete

# ================================
# Production stage
# ================================
FROM base AS runner

WORKDIR /app

# Set environment variables for security and performance
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_PROGRESS=false
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Copy production dependencies
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Copy startup script
COPY --chown=nestjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Security hardening
RUN chown -R nestjs:nodejs /app && \
    chmod -R 755 /app && \
    # Remove potential security risks
    rm -rf /tmp/* /var/tmp/* /root/.npm /home/nestjs/.npm 2>/dev/null || true

# Switch to non-root user
USER nestjs

# Expose port (use non-privileged port)
EXPOSE 3000

# Add labels for better container management
LABEL maintainer="CyberLens Team" \
      version="1.0.3" \
      description="CyberLens Backend API" \
      org.opencontainers.image.source="https://github.com/cyberlens/backend"

# Enhanced health check with better error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly and prevent zombie processes
ENTRYPOINT ["dumb-init", "--"]

# Start the application with proper signal handling
CMD ["./docker-entrypoint.sh"]