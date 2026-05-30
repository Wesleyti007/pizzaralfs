# Publicar Pizza Ralfs em um VPS (opcao 1)

Guia para quem nunca configurou servidor. Tudo roda em **uma maquina**: site + API + banco + HTTPS no seu dominio.

## O que voce vai contratar

- **VPS** (ex.: Contabo Cloud VPS 10, ~5 euros/mes)
- Sistema: **Ubuntu 24.04**
- Voce ja tem o **dominio** (ex.: `pizzaralfs.com.br`)

## Visao geral

```
Cliente -> https://seudominio.com
              -> Caddy (HTTPS automatico)
              -> App Node (cardapio + API)
              -> PostgreSQL (banco)
```

---

## Passo 1 — Contratar o VPS

1. Crie conta na [Contabo](https://contabo.com) (ou Hetzner).
2. Escolha **Cloud VPS 10** (ou similar).
3. Regiao: Europa (mais barato) ou mais perto do Brasil se existir.
4. SO: **Ubuntu 24.04**.
5. Anote no e-mail:
   - **IP** do servidor (ex.: `123.45.67.89`)
   - **Senha root** (ou chave SSH)

---

## Passo 2 — Apontar o dominio

No painel onde comprou o dominio (Registro.br, etc.):

| Tipo | Nome | Valor |
|------|------|--------|
| A | `@` | IP do VPS |
| A | `www` | IP do VPS |

Espere 15 min a 48 h para propagar (geralmente menos de 1 h).

Teste no Mac: `ping seudominio.com.br` — deve responder o IP do VPS.

---

## Passo 3 — Conectar no servidor (SSH)

No Mac, terminal:

```bash
ssh root@SEU_IP_DO_VPS
```

Cole a senha root quando pedir.

---

## Passo 4 — Instalar Docker no VPS

Cole no servidor (uma linha por vez ou o bloco inteiro):

```bash
apt update && apt upgrade -y
apt install -y docker.io docker-compose-v2 git
systemctl enable docker
systemctl start docker
```

---

## Passo 5 — Baixar o projeto

**Opcao A — GitHub (recomendado)**

```bash
cd /opt
git clone https://github.com/SEU_USUARIO/pizza-ralfs.git
cd pizza-ralfs/deploy
```

Troque `SEU_USUARIO/pizza-ralfs` pelo seu repositorio.

**Opcao B — Enviar do Mac com scp**

No **seu Mac** (na pasta do projeto):

```bash
cd /Users/coinfocoinfo/Documents/PizzaRalfs
scp -r . root@SEU_IP:/opt/pizza-ralfs
```

No VPS: `cd /opt/pizza-ralfs/deploy`

---

## Passo 6 — Configurar variaveis

No VPS:

```bash
cd /opt/pizza-ralfs/deploy
cp .env.example .env
nano .env
```

Preencha:

- `DOMAIN` — seu dominio (ex.: `pizzaralfs.com.br`)
- `ACME_EMAIL` — seu e-mail (HTTPS)
- `DB_PASSWORD` — senha longa e unica

Salvar no nano: `Ctrl+O`, Enter, `Ctrl+X`.

---

## Passo 7 — Subir tudo

Ainda em `/opt/pizza-ralfs/deploy`:

```bash
docker compose up -d --build
```

A primeira vez demora (baixa imagens e compila o site). Espere terminar.

Ver se esta rodando:

```bash
docker compose ps
```

Todos devem estar `running`.

---

## Passo 8 — Testar

1. No navegador: `https://seudominio.com.br`
2. Deve abrir o cardapio (loader e depois o menu).
3. API: `https://seudominio.com.br/health` — deve retornar JSON ok.

Admin: `https://seudominio.com.br/acesso-admin-ralfs-2026` — login `admin` / `admin`.

---

## Atualizar producao (novas versoes)

Sempre que mudar codigo no Mac e quiser publicar no VPS:

### 1 — Enviar arquivos para o VPS

**Opcao A — rsync (sem GitHub)** — no Mac, na pasta do projeto:

```bash
cd /Users/coinfocoinfo/Documents/PizzaRalfs
rsync -avz --exclude node_modules --exclude dist --exclude .git --exclude deploy/pgdata \
  ./ root@SEU_IP:/opt/pizza-ralfs/
```

**Opcao B — Git** — no VPS:

```bash
cd /opt/pizza-ralfs
git pull
```

### 2 — Rebuild e subir containers

```bash
cd /opt/pizza-ralfs/deploy
docker compose up -d --build
```

Espere terminar (recompila o front dentro do Docker).

### 3 — Migracao do banco (se pediu delivery ou mudou SQL)

O Postgres em producao **nao** reaplica `init.sql` sozinho. Rode migracoes novas **uma vez**:

```bash
cd /opt/pizza-ralfs/deploy
docker compose exec -T db psql -U pizzaralfs -d pizzaralfs < ../backend/sql/migrate_orders_delivery.sql
docker compose exec -T db psql -U pizzaralfs -d pizzaralfs < ../backend/sql/migrate_delivery_pricing.sql
```

Se aparecer `ALTER TABLE` varias vezes, ok. Se disser que a coluna ja existe, tambem ok.

Outras migracoes (se ainda nao rodou no VPS):

```bash
docker compose exec -T db psql -U pizzaralfs -d pizzaralfs < ../backend/sql/migrate_categories.sql
docker compose exec -T db psql -U pizzaralfs -d pizzaralfs < ../backend/sql/migrate_pizza_sizes.sql
docker compose exec -T db psql -U pizzaralfs -d pizzaralfs < ../backend/sql/migrate_orders_status.sql
```

### 4 — Conferir

```bash
docker compose ps
curl -s https://pizzaralfs.com.br/health
```

No celular: abra `https://pizzaralfs.com.br/` (sem `?mesa=`) e teste um pedido delivery.

**Backup antes de migrar (recomendado):**

```bash
docker compose exec -T db pg_dump -U pizzaralfs pizzaralfs > backup-$(date +%Y%m%d).sql
```

---

## Comandos uteis depois

| O que fazer | Comando (na pasta `deploy`) |
|-------------|-----------------------------|
| Ver logs | `docker compose logs -f app` |
| Reiniciar | `docker compose restart` |
| Atualizar codigo | rsync ou `git pull` + `docker compose up -d --build` + migracoes |
| Parar tudo | `docker compose down` |

---

## Firewall (recomendado)

No VPS:

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

---

## Problemas comuns

**Dominio nao abre HTTPS / ERR_SSL_PROTOCOL_ERROR**  
- O DNS publico ainda nao tem registro A no Registro.br (salve de novo e espere).  
- Enquanto isso o Caddy usa `tls internal` (certificado temporario): o navegador avisa "nao seguro" — clique em Avancado e Continuar.  
- Quando `dig pizzaralfs.com.br +short` mostrar o IP do VPS, remova `tls internal` do `Caddyfile` e rode `docker compose up -d --build`.  
- `DOMAIN` no `.env` sem `www` e sem `https`.

**Cardapio vazio**  
- `docker compose logs app` — erro de banco?  
- Banco so inicializa na **primeira** subida; se apagou volume, `docker compose down -v` e suba de novo (apaga dados).

**Erro 502**  
- App ainda iniciando: `docker compose logs app` e aguarde 30 s.

---

## Custo mensal aproximado

| Item | Valor |
|------|--------|
| VPS Contabo | ~5 EUR (~R$ 30) |
| Dominio | ja pago (renovacao anual) |
| HTTPS (Caddy) | gratis |

---

## Seguranca (faca depois que funcionar)

1. Trocar senha do admin no codigo ou adicionar auth real na API.
2. Backup do banco: `docker compose exec db pg_dump -U pizzaralfs pizzaralfs > backup.sql`
3. Nao compartilhe o arquivo `deploy/.env` (tem senha do banco).
