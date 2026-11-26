#!/bin/sh
# =============================================================================
# docker-entrypoint.sh - Fast Cloud & Local Container Entrypoint
# =============================================================================
set -eu

log() {
  echo "[entrypoint] $*"
}

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

parse_database_url() {
  DB_HOST="${DB_HOST:-}"
  DB_PORT="${DB_PORT:-3306}"

  if [ -z "$DB_HOST" ] && [ -n "${DATABASE_URL:-}" ]; then
    _authority=$(echo "$DATABASE_URL" | sed -e 's|^[a-zA-Z0-9+.-]*://||' -e 's|/.*$||')
    _hostport=$(echo "$_authority" | sed -e 's|^.*@||')
    DB_HOST=$(echo "$_hostport" | cut -d: -f1)
    case "$_hostport" in
      *:*) DB_PORT=$(echo "$_hostport" | cut -d: -f2) ;;
      *) DB_PORT=3306 ;;
    esac
  fi
}

log "Khoi dong | NODE_ENV=${NODE_ENV:-production} | user=$(id -un) | uid=$(id -u)"

# -----------------------------------------------------------------------------
# 1. Infrastructure TCP check (bo qua voi Managed Cloud TLS nhu TiDB Serverless
#    de tiet kiem thoi gian cold-start tren Render Free)
# -----------------------------------------------------------------------------
parse_database_url

case "${DATABASE_URL:-}" in
  *tidbcloud.com*|*sslaccept=*)
    log "Phat hien Cloud TLS Database (${DB_HOST:-cloud}) - bo qua buoc cho TCP thu cong."
    ;;
  *)
    if [ "${WAIT_FOR_DB:-true}" = "true" ] && [ -n "${DB_HOST:-}" ]; then
      wait_for_tcp "$DB_HOST" "$DB_PORT" "Database (MySQL)" "${WAIT_FOR_DB_TIMEOUT:-30}"
    fi
    ;;
esac

if [ "${WAIT_FOR_REDIS:-false}" = "true" ] && [ -n "${REDIS_HOST:-}" ]; then
  wait_for_tcp "$REDIS_HOST" "${REDIS_PORT:-6379}" "Redis" "${WAIT_FOR_REDIS_TIMEOUT:-30}"
fi

# -----------------------------------------------------------------------------
# 2. Fast single-pass DB state probe (kiem tra migration + user count trong 1 lan
#    ket noi thay vi goi Prisma CLI cham chap moi lan container thuc day)
# -----------------------------------------------------------------------------
_need_migrate="false"
_need_seed="false"

if [ "${RUN_MIGRATIONS:-false}" = "true" ] || [ "${SEED_IF_EMPTY:-false}" = "true" ]; then
  _probe=$(node -e "
    const fs = require('fs');
    const path = require('path');
    const { PrismaClient } = require('@prisma/client');
    const migDir = '/app/packages/database/prisma/migrations';
    const localMigs = fs.existsSync(migDir)
      ? fs.readdirSync(migDir, { withFileTypes: true }).filter((d) => d.isDirectory()).length
      : 0;
    const p = new PrismaClient();
    (async () => {
      try {
        const migRows = await p.\$queryRawUnsafe('SELECT COUNT(*) AS c FROM _prisma_migrations WHERE finished_at IS NOT NULL');
        const appliedMigs = Number(migRows?.[0]?.c ?? 0);
        const users = await p.user.count();
        console.log((appliedMigs < localMigs ? 'MIGRATE_YES' : 'MIGRATE_NO') + ':' + users);
      } catch {
        console.log('MIGRATE_YES:-1');
      } finally {
        await p.\$disconnect().catch(() => {});
      }
    })();
  " 2>/dev/null | tail -n 1 || echo "MIGRATE_YES:-1")

  _mig_flag=$(echo "$_probe" | cut -d: -f1)
  _user_count=$(echo "$_probe" | cut -d: -f2)

  if [ "${RUN_MIGRATIONS:-false}" = "true" ] && [ "$_mig_flag" = "MIGRATE_YES" ]; then
    _need_migrate="true"
  elif [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    log "Tat ca Prisma migrations da duoc ap dung san - bo qua Prisma CLI de khoi dong nhanh."
  fi

  if [ "${SEED_IF_EMPTY:-false}" = "true" ]; then
    if [ "$_mig_flag" = "MIGRATE_YES" ] || { [ "${_user_count:-0}" -ge 0 ] && [ "${_user_count:-0}" -lt 10 ]; }; then
      _need_seed="true"
    else
      log "Bo qua auto-seed (users=${_user_count})."
    fi
  fi
fi

if [ "$_need_migrate" = "true" ]; then
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
  fi
fi

if [ "$_need_seed" = "true" ] && [ -f "/app/packages/database/dist/seed-scale-5k.js" ]; then
  _recheck_users=$(node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.user.count()
      .then((c) => { console.log(c); return p.\$disconnect(); })
      .catch(() => { console.log(-1); process.exit(0); });
  " 2>/dev/null | tail -n 1)

  if [ "${_recheck_users:-0}" -ge 0 ] && [ "${_recheck_users:-0}" -lt 10 ]; then
    log "Database dang trong (users=${_recheck_users}). Bat dau nap bo du lieu 5.000 users..."
    node /app/packages/database/dist/seed-scale-5k.js
    log "Nap du lieu 5.000 users hoan tat."
  fi
fi

log "Chay lenh: $*"
exec "$@"
