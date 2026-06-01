#!/usr/bin/env bash
# Backup do PostgreSQL (rode no VPS).
# Uso: bash /opt/pizza-ralfs/deploy/backup-banco.sh

set -euo pipefail

ROOT="${ROOT:-/opt/pizza-ralfs}"
DEPLOY="${ROOT}/deploy"
BACKUP_DIR="${BACKUP_DIR:-${DEPLOY}/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

cd "$DEPLOY"

if [[ ! -f .env ]]; then
  echo "ERRO: .env nao encontrado em ${DEPLOY}"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M)"
OUT="${BACKUP_DIR}/pizzaralfs-${STAMP}.sql.gz"

echo "==> Backup -> ${OUT}"
docker compose exec -T db pg_dump -U pizzaralfs pizzaralfs | gzip -9 > "$OUT"
chmod 600 "$OUT"
ls -lh "$OUT"

echo "==> Remover backups com mais de ${KEEP_DAYS} dias"
find "$BACKUP_DIR" -name 'pizzaralfs-*.sql.gz' -mtime +"${KEEP_DAYS}" -delete 2>/dev/null || true
echo "Backups em ${BACKUP_DIR}:"
ls -lh "$BACKUP_DIR" 2>/dev/null | tail -10 || true
