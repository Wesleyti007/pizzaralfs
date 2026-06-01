#!/usr/bin/env bash
# Rode NO VPS (como root), dentro de /opt/pizza-ralfs/deploy
# Uso: bash publicar-no-vps.sh

set -euo pipefail

ROOT="/opt/pizza-ralfs"
cd "${ROOT}/deploy"

echo "==> Conferindo codigo em ${ROOT}"
if ! grep -q 'admin/ralfs' "${ROOT}/src/App.jsx" 2>/dev/null; then
  echo "ERRO: codigo antigo em ${ROOT}"
  echo "Primeiro envie o projeto DO SEU MAC:"
  echo "  rsync -avz --exclude node_modules --exclude .git --exclude deploy/pgdata \\"
  echo "    ./ root@161.97.100.78:/opt/pizza-ralfs/"
  echo "(rode isso no Mac, na pasta PizzaRalfs — NAO no VPS)"
  exit 1
fi

echo "==> Build do frontend (usa imagem node local, se existir)"
if docker image inspect node:20-alpine >/dev/null 2>&1; then
  docker run --rm \
    -v "${ROOT}:/app" \
    -w /app \
    -e VITE_API_URL= \
    -e VITE_ADMIN_USER="${ADMIN_USER:-admin}" \
    -e VITE_ADMIN_PASSWORD="${ADMIN_PASSWORD:-25364758@Cd}" \
    node:20-alpine \
    sh -c "npm ci && npm run build"
else
  echo "AVISO: imagem node:20-alpine nao encontrada."
  echo "Copie a pasta dist/ do Mac OU rode: bash ${ROOT}/deploy/corrigir-dns-docker.sh"
  echo "Depois: docker pull node:20-alpine && bash $0"
  if [ ! -f "${ROOT}/dist/index.html" ]; then
    exit 1
  fi
  echo "Usando dist/ ja existente..."
fi

echo "==> .env do deploy"
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "==> Subir app + Caddy"
# /health release = data deste deploy (sobrescreve APP_RELEASE fixo no .env)
export APP_RELEASE="$(date +%Y%m%d)"
echo "    APP_RELEASE=${APP_RELEASE}"
docker compose up -d --force-recreate app
docker compose restart caddy

echo "==> Health"
sleep 2
curl -s "http://127.0.0.1:3001/health" || true
echo ""
JS=$(grep -oE 'assets/index-[^"]+\.js' "${ROOT}/dist/index.html" | head -1)
echo "JS no dist: ${JS}"
echo ""
echo "Teste: https://pizzaralfs.com.br/admin/ralfs"
echo "Login: admin / ${ADMIN_PASSWORD:-25364758@Cd}"
