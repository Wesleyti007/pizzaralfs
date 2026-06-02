#!/usr/bin/env bash
# Publica no VPS: rsync + docker compose build
# Uso: ./deploy/deploy.sh
#      VPS_HOST=161.97.100.78 ./deploy/deploy.sh

set -euo pipefail

VPS_HOST="${VPS_HOST:-161.97.100.78}"
VPS_USER="${VPS_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/opt/pizza-ralfs}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Build do frontend no Mac (API mesma origem em producao)"
cd "$PROJECT_ROOT"
VITE_API_URL= npm run build

echo "==> Enviando projeto para ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"
rsync -avz \
  --exclude node_modules \
  --exclude .git \
  --exclude deploy/pgdata \
  --exclude '.env' \
  "$PROJECT_ROOT/" "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"

echo "==> Migracoes SQL no VPS (somente pendentes; use RUN_MIGRATIONS=0 para pular)"
if [[ "${RUN_MIGRATIONS:-1}" != "0" ]]; then
  ssh "${VPS_USER}@${VPS_HOST}" \
    "cd ${REMOTE_DIR}/deploy && chmod +x migrate.sh && ./migrate.sh"
else
  echo "    (pulado: RUN_MIGRATIONS=0)"
fi

echo "==> Reiniciar app e Caddy no VPS (usa dist/ e backend/src/ do disco)"
ssh "${VPS_USER}@${VPS_HOST}" \
  "cd ${REMOTE_DIR}/deploy && export APP_RELEASE=\$(date +%Y%m%d) && echo \"APP_RELEASE=\$APP_RELEASE\" && docker compose up -d --force-recreate app && docker compose restart caddy"

echo "==> Status dos containers"
ssh "${VPS_USER}@${VPS_HOST}" "cd ${REMOTE_DIR}/deploy && docker compose ps"

echo "==> Conferir versao publicada"
ssh "${VPS_USER}@${VPS_HOST}" "curl -s https://pizzaralfs.com.br/health || curl -s http://127.0.0.1:3001/health" || true

echo ""
echo "Pronto. Teste: https://pizzaralfs.com.br/health  (release = data do deploy no VPS, ex. $(date +%Y%m%d))"
echo "Admin:  https://pizzaralfs.com.br/admin/ralfs"
echo "        usuario admin | senha definida em deploy/.env (ADMIN_PASSWORD)"
