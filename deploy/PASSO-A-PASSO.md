# Deploy Pizza Ralfs — do zero

IP do servidor: **161.97.100.78**  
Pasta no servidor: **/opt/pizza-ralfs**  
Site: **https://pizzaralfs.com.br**  
Admin: **https://pizzaralfs.com.br/admin/ralfs**

---

## Antes de tudo: onde você está?

Olhe o **prompt** (texto antes do cursor):

| Prompt | Onde você está | Pode usar `npm` e `/Users/...`? |
|--------|----------------|----------------------------------|
| `coinfocoinfo@MacBook...` ou `%` | **Mac** | Sim |
| `root@vmi3332076` | **VPS (servidor)** | Não |

- Comandos com `npm`, `rsync` e `cd /Users/coinfocoinfo/...` → **só no Mac**
- Comandos com `docker compose` e migrações → **só no VPS**

Se o Cursor estiver em **SSH Remote**, o terminal abre no VPS. Para deploy: use o terminal **local** do Mac ou desconecte o SSH (canto inferior esquerdo do Cursor).

---

## Deploy completo (sempre nesta ordem)

### Etapa 1 — Mac: preparar e enviar

Abra o **Terminal do Mac** (ou terminal local no Cursor, **sem** `root@vmi3332076`):

```bash
cd /Users/coinfocoinfo/Documents/PizzaRalfs
npm run deploy
```

O que esse comando faz:

1. `npm run build` — gera a pasta `dist/`
2. `rsync` — copia o projeto para o VPS
3. SSH — roda migrações SQL no banco
4. SSH — reinicia o site (app + Caddy)

Digite a **senha do VPS** quando o `rsync` ou `ssh` pedirem.

**Deu certo?** O `rsync` deve listar muitas pastas (`src/`, `dist/`, `backend/`…), não só “sent 230 bytes”.

---

### Etapa 2 — Conferir no VPS (opcional)

```bash
ssh root@161.97.100.78
cd /opt/pizza-ralfs/deploy
curl -s http://127.0.0.1:3001/health
grep -o 'assets/index-[^"]*\.js' /opt/pizza-ralfs/dist/index.html
```

Esperado:

- `"release":"20260531"` no health
- Arquivo JS novo (não `index-B1_4DoIy.js`)

Saia do SSH: `exit`

---

### Etapa 3 — Testar no celular/PC

1. Aba **anônima** (ou limpar cache)
2. https://pizzaralfs.com.br/
3. https://pizzaralfs.com.br/admin/ralfs  
   - Usuário: `admin`  
   - Senha: `25364758@Cd` (ou a que está em `deploy/.env` no VPS como `ADMIN_PASSWORD`)

---

## Se `npm run deploy` falhar no Mac

### A) Só enviar arquivos (Mac)

```bash
cd /Users/coinfocoinfo/Documents/PizzaRalfs
npm run build
rsync -avz \
  --exclude node_modules \
  --exclude .git \
  --exclude deploy/pgdata \
  --exclude '.env' \
  ./ root@161.97.100.78:/opt/pizza-ralfs/
```

### B) Migrações + reiniciar (VPS)

```bash
ssh root@161.97.100.78
cd /opt/pizza-ralfs/deploy

for f in migrate_categories.sql migrate_pizza_sizes.sql migrate_orders_status.sql \
  migrate_orders_delivery.sql migrate_delivery_pricing.sql migrate_delivery_km_cep.sql \
  migrate_menu_item_active.sql; do
  echo "==> $f"
  docker compose exec -T db psql -U pizzaralfs -d pizzaralfs < ../backend/sql/$f
done

docker compose up -d --force-recreate app
docker compose restart caddy
curl -s http://127.0.0.1:3001/health
```

---

## Alternativa: GitHub (se não conseguir rsync no Mac)

### Mac — commit e push

No Cursor: Source Control → Commit → Push  

Ou:

```bash
cd /Users/coinfocoinfo/Documents/PizzaRalfs
git add -A
git commit -m "atualizacao producao"
git push origin main
```

### VPS — puxar e publicar

```bash
ssh root@161.97.100.78
cd /opt/pizza-ralfs
git pull origin main

docker run --rm -v /opt/pizza-ralfs:/app -w /app \
  -e VITE_API_URL= \
  -e VITE_ADMIN_USER=admin \
  -e VITE_ADMIN_PASSWORD='25364758@Cd' \
  node:20-alpine sh -c "npm ci && npm run build"

cd deploy
docker compose up -d --force-recreate app
docker compose restart caddy
curl -s http://127.0.0.1:3001/health
```

---

## Configuração do VPS (só na primeira vez)

Arquivo `/opt/pizza-ralfs/deploy/.env`:

```env
DOMAIN=pizzaralfs.com.br
ACME_EMAIL=seu-email@gmail.com
DB_PASSWORD=senha_forte_do_banco
ADMIN_USER=admin
ADMIN_PASSWORD=25364758@Cd
APP_RELEASE=20260531
```

---

## Resumo em 4 linhas

1. **Mac:** `cd /Users/coinfocoinfo/Documents/PizzaRalfs && npm run deploy`
2. Esperar terminar (senha SSH se pedir)
3. **Navegador:** testar `/admin/ralfs`
4. Se ainda site antigo → aba anônima ou conferir `health` com `release`

---

## Erros comuns

| Sintoma | Causa | Solução |
|---------|--------|---------|
| `No such file /Users/...` | Comando no VPS | Rodar no **Mac** |
| `npm not found` | Comando no VPS | Rodar no **Mac** |
| `rsync sent 230 bytes` | `rsync` no VPS | Rodar no **Mac** |
| Ainda login `admin/admin` | Código novo não chegou | Repetir etapa 1 no **Mac** |
| `docker build` timeout | DNS do VPS | Use `npm run deploy` (build no Mac) |

---

## Backup do banco (antes de migração importante)

No VPS:

```bash
cd /opt/pizza-ralfs/deploy
docker compose exec -T db pg_dump -U pizzaralfs pizzaralfs > backup-$(date +%Y%m%d).sql
```
