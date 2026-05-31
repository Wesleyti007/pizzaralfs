#!/usr/bin/env bash
# Rode NO VPS como root quando docker build falhar com timeout no registry-1.docker.io

set -euo pipefail

echo "==> DNS atual"
cat /etc/resolv.conf || true

echo "==> Ajustar resolved (Ubuntu)"
mkdir -p /etc/systemd/resolved.conf.d
cat > /etc/systemd/resolved.conf.d/dns.conf <<'EOF'
[Resolve]
DNS=8.8.8.8 1.1.1.1
FallbackDNS=9.9.9.9
EOF
systemctl restart systemd-resolved 2>/dev/null || true

echo "==> Docker daemon DNS"
mkdir -p /etc/docker
if [ -f /etc/docker/daemon.json ]; then
  cp /etc/docker/daemon.json /etc/docker/daemon.json.bak.$(date +%s)
fi
cat > /etc/docker/daemon.json <<'EOF'
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
EOF
systemctl restart docker

echo "==> Teste"
sleep 2
docker pull node:20-alpine
echo "OK — tente: docker compose build --no-cache app"
