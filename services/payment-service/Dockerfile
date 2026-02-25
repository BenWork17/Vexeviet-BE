# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy workspace packages
COPY packages ./packages
COPY services/payment-service ./services/payment-service

# Install pnpm
RUN npm install -g pnpm@8.12.0

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the service
WORKDIR /app/services/payment-service
RUN pnpm build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy workspace packages
COPY packages ./packages

# Copy built service
COPY --from=builder /app/services/payment-service/dist ./services/payment-service/dist
COPY --from=builder /app/services/payment-service/package.json ./services/payment-service/

# Install pnpm and production dependencies only
RUN npm install -g pnpm@8.12.0 && \
    pnpm install --prod --frozen-lockfile

WORKDIR /app/services/payment-service

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the service
CMD ["node", "dist/index.js"]
