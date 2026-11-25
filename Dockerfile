# =============================================================================
# VeXeViet Unified Backend Dockerfile (API Gateway + 4 Microservices in 1 Pod)
# Optimized for Render Free Tier (512MB RAM) & single-container cloud deploys
# =============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages ./packages
COPY services ./services
COPY apps ./apps

RUN npm install -g pnpm@8.12.0 && \
    pnpm install --frozen-lockfile && \
    pnpm --filter @vexeviet/database exec prisma generate && \
    pnpm build && \
    pnpm --filter @vexeviet/database exec tsc prisma/seed-scale-5k.ts --outDir dist --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck

# -----------------------------------------------------------------------------
# Production Runner Stage
# -----------------------------------------------------------------------------
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl ca-certificates && \
    addgroup -S app && adduser -S -G app app && \
    mkdir -p /app/logs /app/uploads && \
    chown -R app:app /app/logs /app/uploads

COPY --chown=app:app package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=builder --chown=app:app /app/packages ./packages

COPY --from=builder --chown=app:app /app/services/user-service/package.json ./services/user-service/
COPY --from=builder --chown=app:app /app/services/user-service/dist ./services/user-service/dist

COPY --from=builder --chown=app:app /app/services/route-service/package.json ./services/route-service/
COPY --from=builder --chown=app:app /app/services/route-service/dist ./services/route-service/dist

COPY --from=builder --chown=app:app /app/services/booking-service/package.json ./services/booking-service/
COPY --from=builder --chown=app:app /app/services/booking-service/dist ./services/booking-service/dist

COPY --from=builder --chown=app:app /app/services/payment-service/package.json ./services/payment-service/
COPY --from=builder --chown=app:app /app/services/payment-service/dist ./services/payment-service/dist

COPY --from=builder --chown=app:app /app/apps/api-gateway/package.json ./apps/api-gateway/
COPY --from=builder --chown=app:app /app/apps/api-gateway/dist ./apps/api-gateway/dist

COPY --chown=app:app scripts/start-unified.js ./scripts/start-unified.js

RUN npm install -g pnpm@8.12.0 && \
    pnpm install --frozen-lockfile && \
    pnpm --filter @vexeviet/database exec prisma generate && \
    pnpm store prune && \
    rm -rf /root/.npm /tmp/*

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && \
    chmod 555 /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOAD_DIR=/app/uploads
ENV WAIT_FOR_REDIS=false

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "const p = process.env.PORT || 3000; require('http').get('http://127.0.0.1:' + p + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

USER app

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "scripts/start-unified.js"]
