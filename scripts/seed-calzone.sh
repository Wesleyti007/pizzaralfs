#!/usr/bin/env bash
# Cria/atualiza itens de Calzone a partir das pizzas ativas + foto padrão.
# Local:
#   ./scripts/seed-calzone.sh
# Produção (VPS):
#   cd /opt/pizza-ralfs && ./scripts/seed-calzone.sh --production

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/backend/sql/seed_calzone_from_pizzas.sql"
IMAGE_SQL="$(mktemp /tmp/calzone-images.XXXXXX.sql)"
trap 'rm -f "$IMAGE_SQL"' EXIT

PRODUCTION=false
if [[ "${1:-}" == "--production" ]]; then
  PRODUCTION=true
fi

if [[ ! -f "$ROOT/public/calzone-default.png" ]]; then
  echo "ERRO: coloque a foto em public/calzone-default.png"
  exit 1
fi

write_image_sql() {
  if command -v node >/dev/null 2>&1; then
    node "$ROOT/scripts/update-calzone-images.mjs" >"$IMAGE_SQL"
    return
  fi
  if [[ "$PRODUCTION" == true ]] && [[ -d "${DEPLOY_DIR:-/opt/pizza-ralfs/deploy}" ]]; then
    (
      cd "${DEPLOY_DIR:-/opt/pizza-ralfs/deploy}"
      docker compose run --rm -v "$ROOT:/work" -w /work node:20-alpine \
        node scripts/update-calzone-images.mjs
    ) >"$IMAGE_SQL"
    return
  fi
  echo "ERRO: Node.js não encontrado para gerar SQL da imagem."
  exit 1
}

write_image_sql

if [[ "$PRODUCTION" == true ]]; then
  DEPLOY_DIR="${DEPLOY_DIR:-/opt/pizza-ralfs/deploy}"
  if [[ ! -d "$DEPLOY_DIR" ]]; then
    echo "ERRO: pasta deploy não encontrada: $DEPLOY_DIR"
    exit 1
  fi
  DB_USER="${DB_USER:-pizzaralfs}"
  DB_NAME="${DB_NAME:-pizzaralfs}"
  echo ">> Seed calzone em PRODUÇÃO (Docker)…"
  (
    cd "$DEPLOY_DIR"
    docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <"$SQL"
    docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <"$IMAGE_SQL"
  )
else
  if [[ -f "$ROOT/deploy/.env" ]]; then
    # shellcheck disable=SC1091
    source "$ROOT/deploy/.env"
  fi
  DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/pizzaralfs}"
  echo ">> Seed calzone em: $DATABASE_URL"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$IMAGE_SQL"
fi

echo ">> Concluído. Faça deploy do frontend (public/calzone-default.png) e reinicie a API."
