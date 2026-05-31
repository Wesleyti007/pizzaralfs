#!/usr/bin/env bash
# Rode em qualquer terminal para saber se está no Mac ou no VPS.

if [ -f /opt/pizza-ralfs/deploy/docker-compose.yml ] && [ "$(hostname 2>/dev/null)" != "MacBook"* ]; then
  echo ">>> VOCE ESTA NO VPS (servidor)"
  echo "    Nao use: npm, cd /Users/..., npm run deploy"
  echo "    Use: docker compose, migracoes SQL, git pull"
  echo ""
  echo "    Para ENVIAR codigo novo, abra terminal no MAC e rode:"
  echo "    cd /Users/coinfocoinfo/Documents/PizzaRalfs && npm run deploy"
  exit 0
fi

if [ -d "/Users/coinfocoinfo/Documents/PizzaRalfs/src" ]; then
  echo ">>> VOCE ESTA NO MAC (certo para deploy)"
  echo "    Rode: cd /Users/coinfocoinfo/Documents/PizzaRalfs && npm run deploy"
  exit 0
fi

echo ">>> Nao identifiquei Mac nem VPS padrao."
echo "    Mac: cd ate a pasta PizzaRalfs e npm run deploy"
echo "    VPS: ssh root@161.97.100.78 e docker compose em /opt/pizza-ralfs/deploy"
