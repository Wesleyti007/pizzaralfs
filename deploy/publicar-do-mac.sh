#!/usr/bin/env bash
# Rode NO MAC (na pasta do projeto). Envia codigo + dist e reinicia no VPS.
# Uso: ./deploy/publicar-do-mac.sh

set -euo pipefail

VPS_HOST="${VPS_HOST:-161.97.100.78}"
VPS_USER="${VPS_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/opt/pizza-ralfs}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "==> Build do frontend no Mac"
npm run build

echo "==> Enviando para ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"
rsync -avz \
  --exclude node_modules \
  --exclude .git \
  --exclude deploy/pgdata \
  --exclude '.env' \
  "$PROJECT_ROOT/" "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"

echo "==> Reiniciar app e Caddy no VPS"
ssh "${VPS_USER}@${VPS_HOST}" \
  "cd ${REMOTE_DIR}/deploy && export APP_RELEASE=\$(date +%Y%m%d) && echo \"APP_RELEASE=\$APP_RELEASE\" && docker compose up -d --force-recreate app && docker compose restart caddy"

echo "==> Health"
ssh "${VPS_USER}@${VPS_HOST}" "curl -s http://127.0.0.1:3001/health || true"

echo ""
echo "Pronto: https://pizzaralfs.com.br/admin/ralfs"
echo "Confira release no health (deve ser a data de hoje: $(date +%Y%m%d))."
