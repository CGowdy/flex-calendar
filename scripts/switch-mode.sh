#!/usr/bin/env bash
set -euo pipefail

MODE=${1:-}
if [[ -z "${MODE}" ]]; then
  echo "Usage: scripts/switch-mode.sh [dev|full]" 1>&2
  exit 1
fi

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ENV_FILE="${ROOT_DIR}/.env"
MONGO_ENV_FILE="${ROOT_DIR}/.env.mongo"
TS=$(date +%Y%m%d-%H%M%S)

backup_env() {
  if [[ -f "${ENV_FILE}" ]]; then
    cp "${ENV_FILE}" "${ENV_FILE}.${TS}.bak"
    echo "Backed up existing .env to .env.${TS}.bak"
  fi
}

write_dev_env() {
  cat > "${ENV_FILE}" <<'EOF'
NODE_ENV=development
PORT=3333
HOST=0.0.0.0
# Connect to local Docker Mongo (see infra/docker-compose.dev.yml)
MONGODB_URI=mongodb://root:example@localhost:27018/flex-calendar?authMechanism=DEFAULT
# CORS not needed; Vite dev server proxies /api
# CORS_ORIGIN=http://localhost:5173
# Frontend uses Vite proxy; leave unset unless bypassing proxy
# VITE_API_URL=http://localhost:3333/api
EOF

  if [[ ! -f "${MONGO_ENV_FILE}" ]]; then
    cat > "${MONGO_ENV_FILE}" <<'EOF'
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=example
EOF
    echo "Wrote ${MONGO_ENV_FILE}"
  fi

  echo "Wrote dev .env for DB-in-Docker mode"
  echo "Start DB: docker compose -f infra/docker-compose.dev.yml up -d"
}

write_full_env() {
  cat > "${ENV_FILE}" <<'EOF'
NODE_ENV=production
PORT=3333
HOST=0.0.0.0
# API connects to the mongo container by name inside the compose network
MONGODB_URI=mongodb://root:example@mongo:27017/flex-calendar?authMechanism=DEFAULT
# Caddy serves SPA and proxies /api -> api:3333; no CORS needed
# VITE_API_URL=/api
EOF
  if [[ ! -f "${MONGO_ENV_FILE}" ]]; then
    cat > "${MONGO_ENV_FILE}" <<'EOF'
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=example
EOF
    echo "Wrote ${MONGO_ENV_FILE}"
  fi
  echo "Wrote full-stack .env for NAS compose"
  echo "Bring up: cd infra && docker compose -f docker-compose.full.yml up -d --build"
}

case "${MODE}" in
  dev)
    backup_env
    write_dev_env
    ;;
  full)
    backup_env
    write_full_env
    ;;
  *)
    echo "Unknown mode: ${MODE}. Expected dev or full." 1>&2
    exit 1
    ;;
esac
