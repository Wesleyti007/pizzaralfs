#!/usr/bin/env bash
# Rode NO VPS: bash /opt/pizza-ralfs/deploy/verificar-vps.sh

set -euo pipefail

ROOT="${ROOT:-/opt/pizza-ralfs}"

echo "==> Código em ${ROOT}"
if grep -q "admin/ralfs" "${ROOT}/src/App.jsx" 2>/dev/null; then
  echo "OK: src/App.jsx tem rota /admin/ralfs"
else
  echo "ERRO: código antigo — rode rsync do Mac antes do build"
  exit 1
fi

echo "==> Health da API"
curl -s "http://127.0.0.1:3001/health" || true
echo ""

if curl -s "http://127.0.0.1:3001/health" | grep -q '"release":"20260531"'; then
  echo "OK: API versão nova (release 20260531)"
else
  echo "AVISO: API sem release 20260531 — precisa docker compose build --no-cache app"
fi

echo "==> JS publicado (hash no index)"
grep -oE 'assets/index-[^"]+\.js' "${ROOT}/dist/index.html" 2>/dev/null || \
  docker compose -f "${ROOT}/deploy/docker-compose.yml" exec -T app \
    sh -c 'grep -oE "assets/index-[^\"]+\.js" /app/dist/index.html' 2>/dev/null || \
  echo "(rode build e confira dist/index.html)"

echo ""
echo "Admin após deploy: https://pizzaralfs.com.br/admin/ralfs"
