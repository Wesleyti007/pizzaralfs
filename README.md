# Pizza Ralf's — Cardápio digital

Sistema de cardápio e pedidos para pizzaria: o cliente monta o pedido pelo celular (com QR Code por mesa), e o admin gerencia produtos, categorias e mesas.

## Funcionalidades

- **Cardápio** por categoria e subcategoria (ex.: Pizzas → Doces, Premium)
- **Pizzas** com tamanhos (Broto, Média, Grande) e preço por tamanho
- **Meia a meia / múltiplos sabores** (Média e Grande; pode misturar salgada e doce)
- **Carrinho** e envio de pedido com identificação de mesa (QR Code)
- **Painel admin**: cadastro de itens, categorias, mesas e impressão de QR Codes
- **Pedidos** (`/pedidos`): lista para impressão em 2 vias, status impresso / não impresso
- **Fallback offline**: se a API falhar, o último pedido pode ser salvo no navegador

## Stack

| Camada      | Tecnologia        |
|------------|-------------------|
| Frontend   | React 19, Vite, React Router |
| Backend    | Node.js, Express  |
| Banco      | PostgreSQL        |
| Produção   | Docker, Caddy (HTTPS) — ver [deploy/DEPLOY-VPS.md](deploy/DEPLOY-VPS.md) |

## Estrutura do projeto

```
├── src/                 # Frontend (React)
│   ├── App.jsx          # UI principal (cardápio, admin, pedidos)
│   ├── catalog.js       # Regras de cardápio (categorias, preços, meia a meia)
│   └── App.css
├── backend/
│   ├── src/             # API Express
│   └── sql/             # Schema, seed e migrações
├── public/              # Assets estáticos (logo, favicon)
└── deploy/              # Docker Compose + Caddy para VPS
```

## Pré-requisitos

- Node.js 20+
- PostgreSQL 14+
- `psql` no PATH (para scripts do banco)

## Desenvolvimento local

### 1. Banco de dados

```bash
createdb pizzaralfs   # se ainda não existir

cd backend
npm run db:init
npm run db:seed
```

Se o banco já existia, aplique as migrações:

```bash
psql -U postgres -d pizzaralfs -f sql/migrate_categories.sql
psql -U postgres -d pizzaralfs -f sql/migrate_pizza_sizes.sql
psql -U postgres -d pizzaralfs -f sql/migrate_orders_status.sql
```

### 2. API

```bash
cd backend
cp .env.example .env   # ajuste usuário/senha do Postgres
npm install
npm run dev
```

API em `http://localhost:3001` — teste: `GET /health`

### 3. Frontend

Em outro terminal, na raiz:

```bash
cp .env.example .env    # opcional; padrão já aponta para :3001
npm install
npm run dev
```

App em `http://localhost:5173`

**Recomendado — front + API juntos:**

```bash
npm run dev:all
```

Ou em dois terminais: `npm run dev` (raiz) e `npm run dev:api` (API em `:3001`).

> Sem a API rodando, o admin **não grava** alterações no banco (só mostra o cardápio local).

## Variáveis de ambiente

| Arquivo | Variável | Descrição |
|---------|----------|-----------|
| `.env` (raiz) | `VITE_API_URL` | URL da API no build do Vite |
| `backend/.env` | `PORT`, `DB_*` | Conexão PostgreSQL e porta da API |
| `deploy/.env` | `DOMAIN`, `ACME_EMAIL`, `DB_PASSWORD` | Produção no VPS |

Nunca commite `.env` com senhas reais (já estão no `.gitignore`).

## API (resumo)

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/health` | Status da API e do banco |
| GET/PUT | `/categories` | Listar / salvar categorias |
| GET/POST | `/menu-items` | Cardápio |
| PUT/DELETE | `/menu-items/:id` | Editar / remover item |
| POST | `/orders` | Criar pedido |
| GET | `/orders` | Listar pedidos |
| GET | `/orders/:id/items` | Itens do pedido |
| GET | `/orders/report?from=&to=` | Relatório de vendas e cancelamentos |
| PATCH | `/orders/:id/status` | Status (`pending`, `printed`, `cancelled`, etc.) |

## Scripts npm

| Comando | Onde | Descrição |
|---------|------|-----------|
| `npm run dev` | raiz | Frontend (Vite) |
| `npm run dev:api` | raiz | Backend |
| `npm run build` | raiz | Build de produção (`dist/`) |
| `npm run lint` | raiz | ESLint no frontend |
| `npm run db:init` | backend | Cria tabelas |
| `npm run db:seed` | backend | Dados iniciais |

## Produção

Deploy completo (site + API + banco + HTTPS) no VPS:

**[deploy/DEPLOY-VPS.md](deploy/DEPLOY-VPS.md)**

Build local de teste:

```bash
npm run build
npm run preview
```

## Admin (desenvolvimento)

- Rotas: `/acesso-admin-ralfs-2026` (login), `/admin`, `/pedidos`
- Credenciais padrão no código: `admin` / `admin`

> **Segurança:** o login do admin hoje é apenas no frontend. Em produção, troque as credenciais, use HTTPS e planeje autenticação real na API antes de expor o painel publicamente.

## Boas práticas adotadas

- Separação de **regras de negócio** do cardápio em `catalog.js` (preços, meia a meia, categorias)
- **Migrações SQL** versionadas em `backend/sql/`
- **`.env.example`** sem segredos; senhas só em `.env` local
- **Docker** para ambiente de produção reproduzível
- **ESLint** no frontend
- Fallback de pedido quando a API está indisponível

## Melhorias recomendadas (roadmap)

- Autenticação JWT (ou similar) na API para o admin
- Dividir `App.jsx` em componentes/páginas menores
- Testes automatizados (API e fluxos críticos do cardápio)
- Remover cardápio estático duplicado (`defaultMenu` no front vs `seed.sql`)

## Licença

Projeto privado — Pizza Ralf's.
