#!/bin/sh
# =============================================================================
# docker-entrypoint.sh - Script khởi động container
# =============================================================================
# Vai tro: la LUONG CHAY DAU TIEN truoc khi khoi dong application (CMD).
#   1. Kiem tra/mo phong benefits (DB, Redis) den khi san sang (vi tri chaos:
#      container len truoc service khac -> app crash khi connect qua som)
#   2. (Tuy chon) chay database migration
#   3. exec CMD -> chuyen quyen PID 1 sang loi chinh (node), nhan signal dung
#
# Chay voi quyen khong-phai-root (USER app trong Dockerfile).
# Syntax: POSIX sh (Alpine/busybox ash) - khong dung bash.
# =============================================================================
set -eu

log() {
  echo "[entrypoint] $*"
}

# ---------------------------------------------------------------------------
# Cho den khi TCP host:port san sang. Dung node co san trong image
# (khong can cai them curl/nc - giam image size & attack surface).
#   $1 = host, $2 = port, $3 = ten dich, $4 = so lan thu toi da (mac dinh 30)
# ---------------------------------------------------------------------------
wait_for_tcp() {
  _host="$1"
  _port="$2"
  _name="$3"
  _max="${4:-30}"
  _attempt=1

  while [ "$_attempt" -le "$_max" ]; do
    if node -e "
      const net = require('net');
      const s = net.connect({ host: '${_host}', port: ${_port} }, () => { s.end(); process.exit(0); });
      s.setTimeout(1500, () => { s.destroy(); process.exit(1); });
      s.on('error', () => process.exit(1));
    " 2>/dev/null; then
      log "${_name} san sang (${_host}:${_port})."
      return 0
    fi
    log "Cho ${_name} (${_host}:${_port})... lan ${_attempt}/${_max}"
    _attempt=$((_attempt + 1))
    sleep 2
  done

  log "LOI: ${_name} khong san sang sau $((_max * 2)) giay. Dung khoi dong."
  return 1
}

# ---------------------------------------------------------------------------
# Trich xuat host/port tu DATABASE_URL (mysql://user:pass@host:port/db)
# Uu tien DB_HOST/DB_PORT neu duoc set truc tiep.
# ---------------------------------------------------------------------------
parse_database_url() {
  DB_HOST="${DB_HOST:-}"
  DB_PORT="${DB_PORT:-3306}"

  if [ -z "$DB_HOST" ] && [ -n "${DATABASE_URL:-}" ]; then
    _authority=$(echo "$DATABASE_URL" | sed -e 's|^[a-zA-Z0-9+.-]*://||' -e 's|/.*$||')
    _hostport=$(echo "$_authority" | sed -e 's|^.*@||') # bo userInfo (user:pass@)
    DB_HOST=$(echo "$_hostport" | cut -d: -f1)
    case "$_hostport" in
      *:*) DB_PORT=$(echo "$_hostport" | cut -d: -f2) ;;
      *) DB_PORT=3306 ;;
    esac
  fi
}

# =============================================================================
# 1. CHAO HOI (khong in ra secrets)
# =============================================================================
log "Khoi dong | NODE_ENV=${NODE_ENV:-production} | user=$(id -un) | uid=$(id -u)"

# =============================================================================
# 2. CHO HANH PHUC (infrastructure readiness)
# =============================================================================
parse_database_url

if [ "${WAIT_FOR_DB:-true}" = "true" ] && [ -n "${DB_HOST:-}" ]; then
  wait_for_tcp "$DB_HOST" "$DB_PORT" "Database (MySQL)" "${WAIT_FOR_DB_TIMEOUT:-30}"
else
  log "Bo qua cho Database (WAIT_FOR_DB=false hoac chua co DATABASE_URL)."
fi

if [ "${WAIT_FOR_REDIS:-true}" = "true" ] && [ -n "${REDIS_HOST:-}" ]; then
  wait_for_tcp "$REDIS_HOST" "${REDIS_PORT:-6379}" "Redis" "${WAIT_FOR_REDIS_TIMEOUT:-30}"
else
  log "Bo qua cho Redis (chua set REDIS_HOST)."
fi

# =============================================================================
# 3. DATABASE MIGRATION (tuy chon - chi chay khi duoc bat va co Prisma CLI)
# =============================================================================
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  _prisma_bin=""
  if [ -x "/app/node_modules/.bin/prisma" ]; then
    _prisma_bin="/app/node_modules/.bin/prisma"
  elif [ -x "/app/packages/database/node_modules/.bin/prisma" ]; then
    _prisma_bin="/app/packages/database/node_modules/.bin/prisma"
  fi

  if [ -n "$_prisma_bin" ] && [ -f "/app/packages/database/prisma/schema.prisma" ]; then
    log "Chay database migration (prisma migrate deploy)..."
    (cd /app/packages/database && "$_prisma_bin" migrate deploy)
    log "Migration hoan tat."
  else
    log "WARN: RUN_MIGRATIONS=true nhung khong tim thay Prisma CLI (la devDependency,"
    log "      khong cai trong production image). Bo qua - dung cach khac (job/CI) de migrate."
  fi
fi

# =============================================================================
# 4. EXEC - chuyen quyen PID 1 sang loi chinh (CMD hoac lenh custom)
# =============================================================================
log "Chay lenh: $*"
exec "$@"
