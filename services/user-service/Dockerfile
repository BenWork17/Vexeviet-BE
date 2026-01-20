# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy workspace packages
COPY packages ./packages
COPY services/user-service ./services/user-service

# Install pnpm
RUN npm install -g pnpm@8.12.0

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the service
WORKDIR /app/services/user-service
RUN pnpm build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy workspace packages
COPY packages ./packages

# Copy built service
COPY --from=builder /app/services/user-service/dist ./services/user-service/dist
COPY --from=builder /app/services/user-service/package.json ./services/user-service/

# Install pnpm and production dependencies only
RUN npm install -g pnpm@8.12.0 && \
    pnpm install --prod --frozen-lockfile

WORKDIR /app/services/user-service

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the service
CMD ["node", "dist/index.js"]
