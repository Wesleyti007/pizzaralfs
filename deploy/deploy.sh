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

echo "==> Enviando projeto para ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"
rsync -avz \
  --exclude node_modules \
  --exclude dist \
  --exclude .git \
  --exclude deploy/pgdata \
  --exclude '.env' \
  "$PROJECT_ROOT/" "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"

echo "==> Rebuild e restart no VPS"
ssh "${VPS_USER}@${VPS_HOST}" "cd ${REMOTE_DIR}/deploy && docker compose up -d --build"

echo "==> Status dos containers"
ssh "${VPS_USER}@${VPS_HOST}" "cd ${REMOTE_DIR}/deploy && docker compose ps"

echo ""
echo "Pronto. Teste: https://pizzaralfs.com.br/health"
echo "Admin:  https://pizzaralfs.com.br/acesso-admin-ralfs-2026"
echo ""
echo "Migracoes SQL (se precisar, rode no VPS):"
echo "  ssh ${VPS_USER}@${VPS_HOST}"
echo "  cd ${REMOTE_DIR}/deploy"
echo "  docker compose exec -T db psql -U pizzaralfs -d pizzaralfs < ../backend/sql/migrate_orders_delivery.sql"
echo "  docker compose exec -T db psql -U pizzaralfs -d pizzaralfs < ../backend/sql/migrate_delivery_pricing.sql"
echo "  docker compose exec -T db psql -U pizzaralfs -d pizzaralfs < ../backend/sql/migrate_delivery_km_cep.sql"
