# =============================================================================
# user-service Dockerfile - Multi-stage build
# Base image: node:18-alpine (nhe, chi ~180MB, co Node.js 18 + Alpine Linux)
# =============================================================================

# ---------------------------------------------------------------------------
# Build stage (stage 1): chi dung de build, khong dua vao production image
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
# Root tsconfig: cac tsconfig cua workspace deu `extends: ../../tsconfig.json`
COPY tsconfig.json ./

# Copy workspace packages
COPY packages ./packages
COPY services/user-service ./services/user-service

# RUN (1) - MUC DICH: cai package/tool (pnpm) he thong
RUN npm install -g pnpm@8.12.0

# RUN (2) - MUC DICH: cai dependency (node_modules) tu lockfile
RUN pnpm install --frozen-lockfile

# RUN (3) - MUC DICH: sinh Prisma Client (bien dich schema -> @prisma/client)
#       - Can cho CA typecheck (enum UserStatus/... va runtime).
#       - Chay bang CLI cua @vexeviet/database (devDep, da cai o buoc 2).
RUN pnpm --filter @vexeviet/database exec prisma generate

# RUN (4) - MUC DICH: build/sinh product (tsc -> dist/)
WORKDIR /app/services/user-service
RUN pnpm build

# ---------------------------------------------------------------------------
# Production stage (stage 2): chi chua nhung gi can thiet de chay
# ---------------------------------------------------------------------------
FROM node:20-alpine

WORKDIR /app

# RUN (4) - MUC DICH: cai system package + chuan bi moi truong + phan quyen
#   - apk: cai `openssl` (CLI) de Prisma phat hien duoc OpenSSL 3 tren Alpine
#     3.19+ (khong co libssl.so.1.1) -> runtime chon dung query engine.
#   - tao user/group khong-privileged `app` (khong phai root)
#   - tao thu muc log duoc phep ghi, chown cho user app
RUN apk add --no-cache openssl && \
    addgroup -S app && adduser -S -G app app && \
    mkdir -p /app/logs /app/uploads && \
    chown -R app:app /app/logs /app/uploads

# Copy files, rieng cac file chinh thi chu so huu la app (app doc/ghi duoc)
COPY --chown=app:app package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=app:app packages ./packages
COPY --from=builder --chown=app:app /app/services/user-service/dist ./services/user-service/dist
COPY --from=builder --chown=app:app /app/services/user-service/package.json ./services/user-service/

# RUN (5) - MUC DICH: cai dependency + sinh Prisma Client
#   Cau hinh giu FROZEN lockfile (pnpm install co-khi packaged_client bin khong
#   duoc generate sau `--prod`) - chay truoc khi ha quyen USER.
#   GHI CHU: dang cai full de co Prisma CLI sinh client; toi uu production
#   co the tach `prisma generate` sang builder roi copy cache (xem DOCKER-ASSIGNMENT.md).
RUN npm install -g pnpm@8.12.0 && \
    pnpm install --frozen-lockfile && \
    pnpm --filter @vexeviet/database exec prisma generate

# Script khoi dong container (docker-entrypoint.sh nam o repo root =
# build context). Se chay TRUOC CMD.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# RUN (6) - MUC DICH: cau hinh permission
#   - sed: bo CRLF (danh cho Windows checkout, tranh loi shebang #!/bin/sh\r)
#   - chmod 555: moi user duoc doc+chay, khong ai ghi duoc (kha nang sua doi)
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && \
    chmod 555 /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV UPLOAD_DIR=/app/uploads

WORKDIR /app/services/user-service

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# HA QUYEN: tat ca process sau day chay bang user `app`, khong phai root
USER app

# ENTRYPOINT = "process co dinh" cua container - khong bi ghi de boi
# `docker run <image> <command>` ma chi chay TRUOC no.
# CMD   = tham so mac dinh, truyen vao ENTRYPOINT, co the ghi de duoc.
# O day: entrypoint chay truoc (cho DB, migration...), roi exec CMD.
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
