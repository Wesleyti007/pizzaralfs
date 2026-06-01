# Segurança no VPS (Contabo + Pizza Ralf's)

Guia para quem deixou o servidor **no padrão de fábrica** (root + senha, sem firewall). A aplicação já ajuda em alguns pontos; o resto é configuração no Ubuntu.

## O que já está bom no projeto

| Item | Situação |
|------|----------|
| HTTPS | Caddy + Let's Encrypt em `pizzaralfs.com.br` |
| Banco | Postgres **não** exposto na internet (só rede interna Docker) |
| API Node | Porta 3001 **não** publicada no host — só o Caddy (80/443) |
| Admin | URL não óbvia: `/admin/ralfs` (não é segurança forte sozinha) |
| Segredos | `deploy/.env` não vai no rsync/git (senha do banco) |

## Risco se não fizer nada (Contabo default)

- SSH com **root + senha** → robôs tentam login o dia inteiro.
- **Sem firewall** → qualquer serviço que abrir porta fica exposto.
- Senha **fraca** do admin ou do Postgres → vazamento do `.env` ou do build.
- **API sem login** → quem achar a URL pode listar/alterar pedidos via API (o painel tem senha, a API hoje não).

---

## Passo 1 — Script automático (5 minutos)

No **VPS**, com o projeto em `/opt/pizza-ralfs`:

```bash
bash /opt/pizza-ralfs/deploy/seguranca-vps.sh
```

Isso configura:

- **UFW**: entra só SSH (22), HTTP (80), HTTPS (443).
- **fail2ban**: bloqueia IP após várias senhas SSH erradas.
- **Atualizações automáticas** de pacotes de segurança do Ubuntu.
- **`.env` com permissão 600** (só root lê).

**Importante:** deixe a sessão SSH atual aberta e abra **outra** janela para testar `ssh root@SEU_IP` antes de fechar.

Do Mac, depois de enviar o código:

```bash
ssh root@161.97.100.78 'bash /opt/pizza-ralfs/deploy/seguranca-vps.sh'
```

---

## Passo 2 — Painel Contabo (recomendado)

No painel da Contabo (VPS → Firewall / Security):

- Permita **22** (SSH), **80**, **443** — o mesmo que o UFW.
- Bloqueie o resto, se houver regra “allow all”.

Assim você tem **duas camadas**: Contabo + UFW no Ubuntu.

---

## Passo 3 — SSH com chave (pare de usar só senha)

No **Mac**:

```bash
ssh-keygen -t ed25519 -C "seu-email" -f ~/.ssh/pizzaralfs_vps
ssh-copy-id -i ~/.ssh/pizzaralfs_vps.pub root@SEU_IP
ssh -i ~/.ssh/pizzaralfs_vps root@SEU_IP
```

Se `ssh-copy-id` funcionar, no **VPS** edite SSH (cuidado — teste outra aba antes):

```bash
nano /etc/ssh/sshd_config
```

Ajuste (ou confirme):

```
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
```

Reinicie:

```bash
systemctl restart ssh
```

Troque a **senha root** no Contabo mesmo assim (caso a chave se perca): painel Contabo → reset password.

Opcional: usuário `deploy` com `sudo`, sem login root direto — veja documentação Ubuntu “SSH hardening”.

---

## Passo 4 — Senhas fortes

No VPS:

```bash
nano /opt/pizza-ralfs/deploy/.env
```

- `DB_PASSWORD` — longa, aleatória (20+ caracteres).
- `ADMIN_PASSWORD` — diferente da do banco; não use a senha padrão do exemplo.

Depois de mudar `ADMIN_PASSWORD`, **rebuild** o frontend no deploy (a senha do admin vai no build do Vite):

```bash
# No Mac
npm run deploy
```

---

## Passo 5 — Backup automático do banco

No VPS:

```bash
bash /opt/pizza-ralfs/deploy/backup-banco.sh
```

Agendar todo dia às 3h (cron):

```bash
crontab -e
```

Linha:

```
0 3 * * * /bin/bash /opt/pizza-ralfs/deploy/backup-banco.sh >> /var/log/pizzaralfs-backup.log 2>&1
```

Backups ficam em `/opt/pizza-ralfs/deploy/backups/` (git ignora essa pasta).

---

## Passo 6 — O que **não** fazer

- Não abrir porta **5432** (Postgres) nem **3001** (API) no UFW nem no painel Contabo.
- Não commitar `deploy/.env` no GitHub.
- Não usar a mesma senha em admin, banco e painel Contabo.
- Não desabilitar `PasswordAuthentication` no SSH **antes** de testar a chave em outra janela.

---

## Melhorias futuras (se quiser mais proteção)

1. **Autenticação na API** (token ou sessão) para `/orders` e `/settings`.
2. **Limite de requisições** no Caddy ou na API (anti-abuso no checkout).
3. **2FA** no painel Contabo e e-mail de alerta de login SSH.
4. VPS com **2 GB+ RAM** e monitoramento (Uptime Kuma, alerta de disco cheio).

---

## Checklist rápido

- [ ] Rodei `seguranca-vps.sh`
- [ ] Testei SSH em outra aba
- [ ] Firewall Contabo alinhado (22, 80, 443)
- [ ] Chave SSH + desliguei senha SSH (opcional mas recomendado)
- [ ] `DB_PASSWORD` e `ADMIN_PASSWORD` fortes + redeploy
- [ ] Backup manual OK + cron diário
- [ ] `curl https://pizzaralfs.com.br/health` OK após mudanças

---

## Conferir se está exposto

No VPS:

```bash
ss -tlnp | grep LISTEN
ufw status
docker compose -f /opt/pizza-ralfs/deploy/docker-compose.yml ps
```

Portas públicas esperadas: **22, 80, 443** apenas.
