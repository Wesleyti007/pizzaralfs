#!/usr/bin/env bash
# Remove todos os pedidos e fechamentos de caixa (produção).
# Uso: ./scripts/reset-orders-cash-production.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/backend/sql/reset_orders_and_cash_closings.sql"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/pizza-ralfs/deploy}"
DB_USER="${DB_USER:-pizzaralfs}"
DB_NAME="${DB_NAME:-pizzaralfs}"

echo "ATENÇÃO: isso apaga TODOS os pedidos e fechamentos de caixa em ${DB_NAME}."
echo "Cardápio e categorias não são alterados."
read -r -p "Digite APAGAR para confirmar: " confirm
if [[ "$confirm" != "APAGAR" ]]; then
  echo "Cancelado."
  exit 1
fi

if [[ -d "$DEPLOY_DIR" ]]; then
  cd "$DEPLOY_DIR"
  docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <"$SQL"
else
  DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/pizzaralfs}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL"
fi

echo ">> Concluído. Pedidos e fechamentos zerados."
