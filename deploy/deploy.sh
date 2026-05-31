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

echo "==> Migracoes SQL (idempotentes; ignora colunas ja existentes)"
MIGRATIONS=(
  migrate_categories.sql
  migrate_pizza_sizes.sql
  migrate_orders_status.sql
  migrate_orders_delivery.sql
  migrate_delivery_pricing.sql
  migrate_delivery_km_cep.sql
  migrate_menu_item_active.sql
)
for migration in "${MIGRATIONS[@]}"; do
  echo "    -> ${migration}"
  ssh "${VPS_USER}@${VPS_HOST}" \
    "cd ${REMOTE_DIR}/deploy && docker compose exec -T db psql -U pizzaralfs -d pizzaralfs < ../backend/sql/${migration}" \
    || echo "    (aviso: ${migration} pode ja estar aplicada)"
done

echo "==> Status dos containers"
ssh "${VPS_USER}@${VPS_HOST}" "cd ${REMOTE_DIR}/deploy && docker compose ps"

echo "==> Conferir versao publicada"
ssh "${VPS_USER}@${VPS_HOST}" "curl -s https://pizzaralfs.com.br/health || curl -s http://127.0.0.1:3001/health" || true

echo ""
echo "Pronto. Teste: https://pizzaralfs.com.br/health  (release deve ser 20260531)"
echo "Admin:  https://pizzaralfs.com.br/admin/ralfs"
echo "        usuario admin | senha definida em deploy/.env (ADMIN_PASSWORD)"
