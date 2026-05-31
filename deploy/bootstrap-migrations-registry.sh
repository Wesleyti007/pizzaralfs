#!/usr/bin/env bash
# Use UMA VEZ no VPS se o banco ja tinha todas as migracoes antes do migrate.sh.
# Marca como aplicadas sem reexecutar os SQL.
# cd /opt/pizza-ralfs/deploy && ./bootstrap-migrations-registry.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

DB_USER="${DB_USER:-pizzaralfs}"
DB_NAME="${DB_NAME:-pizzaralfs}"

MIGRATIONS=(
  migrate_categories.sql
  migrate_pizza_sizes.sql
  migrate_orders_status.sql
  migrate_orders_delivery.sql
  migrate_delivery_pricing.sql
  migrate_delivery_km_cep.sql
  migrate_menu_item_active.sql
)

docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
"

for name in "${MIGRATIONS[@]}"; do
  docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -c "INSERT INTO schema_migrations (name) VALUES ('${name}') ON CONFLICT (name) DO NOTHING;"
  echo "    registrado: ${name}"
done

echo "Pronto. Proximos deploys vao pular essas migracoes."
