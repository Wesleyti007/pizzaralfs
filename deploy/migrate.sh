#!/usr/bin/env bash
# Aplica migracoes SQL pendentes (registra em schema_migrations).
# Rode no VPS: cd /opt/pizza-ralfs/deploy && ./migrate.sh
# Ou via deploy: o deploy.sh chama este script por SSH.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

DB_USER="${DB_USER:-pizzaralfs}"
DB_NAME="${DB_NAME:-pizzaralfs}"
SQL_DIR="${SQL_DIR:-${SCRIPT_DIR}/../backend/sql}"

MIGRATIONS=(
  migrate_categories.sql
  migrate_pizza_sizes.sql
  migrate_orders_status.sql
  migrate_orders_delivery.sql
  migrate_delivery_pricing.sql
  migrate_delivery_km_cep.sql
  migrate_menu_item_active.sql
  migrate_orders_payment.sql
  migrate_menu_min_order_qty.sql
  migrate_orders_waiter_name.sql
)

psql_exec() {
  docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" "$@"
}

ensure_migrations_table() {
  psql_exec -v ON_ERROR_STOP=1 -c "
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  " >/dev/null
}

migration_applied() {
  local name="$1"
  psql_exec -tAc "SELECT 1 FROM schema_migrations WHERE name = '${name}' LIMIT 1;" | tr -d '[:space:]'
}

apply_migration() {
  local name="$1"
  local path="${SQL_DIR}/${name}"

  if [[ ! -f "$path" ]]; then
    echo "    (ignorado: arquivo ausente ${name})"
    return 0
  fi

  if [[ "$(migration_applied "$name")" == "1" ]]; then
    echo "    (pulado, ja aplicada: ${name})"
    return 0
  fi

  echo "    -> ${name}"
  psql_exec -v ON_ERROR_STOP=1 <"$path"
  psql_exec -v ON_ERROR_STOP=1 -c "INSERT INTO schema_migrations (name) VALUES ('${name}');"
}

echo "==> Migracoes SQL (somente pendentes)"
ensure_migrations_table

for migration in "${MIGRATIONS[@]}"; do
  apply_migration "$migration"
done
