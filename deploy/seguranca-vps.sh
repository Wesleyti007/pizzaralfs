#!/usr/bin/env bash
# Endurecimento basico do VPS (Ubuntu + Contabo).
# Rode NO SERVIDOR como root (mantenha esta sessao SSH aberta ate testar outra):
#   bash /opt/pizza-ralfs/deploy/seguranca-vps.sh
#
# Nao desabilita senha SSH nem muda porta — isso e manual (ver SEGURANCA-VPS.md).

set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "ERRO: execute como root (sudo -i ou ssh root@...)"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Pacotes (ufw, fail2ban, atualizacoes automaticas)"
apt-get update -qq
apt-get install -y -qq ufw fail2ban unattended-upgrades apt-listchanges

echo "==> Firewall UFW"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH comment 'SSH'
ufw allow 80/tcp comment 'HTTP Lets Encrypt'
ufw allow 443/tcp comment 'HTTPS'
# Nao abrir 3001 nem 5432 — API e Postgres ficam so na rede Docker.

if ufw status | grep -q 'Status: inactive'; then
  ufw --force enable
fi
ufw status numbered

echo "==> fail2ban (bloqueia IP apos tentativas erradas de SSH)"
install -d -m 0755 /etc/fail2ban/jail.d
cat > /etc/fail2ban/jail.d/pizzaralfs-sshd.local <<'EOF'
[sshd]
enabled = true
port = ssh
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl enable fail2ban
systemctl restart fail2ban
fail2ban-client status sshd 2>/dev/null || fail2ban-client status

echo "==> Atualizacoes automaticas de seguranca (unattended-upgrades)"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
systemctl enable unattended-upgrades 2>/dev/null || true
systemctl restart unattended-upgrades 2>/dev/null || true

echo "==> Permissoes do .env do deploy"
ENV_FILE="/opt/pizza-ralfs/deploy/.env"
if [[ -f "$ENV_FILE" ]]; then
  chown root:root "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "OK: $ENV_FILE (600)"
else
  echo "AVISO: $ENV_FILE nao encontrado — crie com cp .env.example .env"
fi

echo "==> Portas em escuta no host (ideal: 22, 80, 443 — sem 5432/3001 publicos)"
ss -tlnp 2>/dev/null | grep -E 'LISTEN.*:(22|80|443|3001|5432)\s' || true

if command -v docker >/dev/null && [[ -d /opt/pizza-ralfs/deploy ]]; then
  echo "==> Containers"
  (cd /opt/pizza-ralfs/deploy && docker compose ps) || true
fi

echo ""
echo "Pronto (camada basica)."
echo "  - Firewall: so SSH + HTTP + HTTPS"
echo "  - fail2ban ativo no SSH"
echo "  - Patches de seguranca automaticos"
echo ""
echo "Faca em seguida (manual, 1x): leia deploy/SEGURANCA-VPS.md"
echo "  1) Chave SSH no Mac e desativar login por senha"
echo "  2) Senha forte em deploy/.env (DB_PASSWORD, ADMIN_PASSWORD)"
echo "  3) Painel Contabo: firewall se existir, mesmas portas"
echo "  4) Backup: bash /opt/pizza-ralfs/deploy/backup-banco.sh"
echo ""
echo "Mantenha esta janela SSH aberta e teste OUTRA aba: ssh root@SEU_IP"
