# Pizza Ralfs - Cardapio + Pedidos

Projeto com:
- Frontend React (Vite)
- API Node.js (Express)
- Banco PostgreSQL

## 1) Subir o banco PostgreSQL

Crie um banco chamado `pizzaralfs` e rode o script:

`backend/sql/init.sql`

Exemplo com `psql` (rode **dentro da pasta `backend`**):

```bash
cd backend
psql -U postgres -d pizzaralfs -f sql/init.sql
psql -U postgres -d pizzaralfs -f sql/seed.sql
```

Ou use os scripts npm (tambem na pasta `backend`):

```bash
npm run db:init
npm run db:seed
```

O `seed.sql` importa os 6 itens iniciais do cardapio (Margherita, Calabresa, etc.) sem duplicar se ja existirem.

Se o banco ja existia antes, rode as migracoes:

```bash
cd backend
psql -U postgres -d pizzaralfs -f sql/migrate_categories.sql
psql -U postgres -d pizzaralfs -f sql/migrate_pizza_sizes.sql
```

**Tamanhos de pizza:** Broto (4 pedacos), Media (6), Grande (8), cada um com preco proprio no admin.

## 2) Configurar e rodar a API

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API padrao: `http://localhost:3001`

Endpoints de categorias:
- `GET /categories` — lista categorias e subcategorias
- `PUT /categories` — salva a arvore completa (admin)

Endpoints principais:
- `GET /health`
- `GET /menu-items`
- `POST /menu-items`
- `PUT /menu-items/:id` (atualizar item existente)
- `DELETE /menu-items/:id`
- `POST /orders`
- `GET /orders`
- `GET /orders/:id/items`
- `PATCH /orders/:id/status`

## 3) Rodar o frontend

Em outro terminal, na raiz do projeto:

```bash
npm install
npm run dev
```

Se quiser apontar para outra URL da API, crie `.env` na raiz:

```bash
VITE_API_URL=http://localhost:3001
```

## Fluxo atual

- Cliente faz pedido na Home
- Produtos do Admin sao persistidos no PostgreSQL (tabela `menu_items`, imagem em base64 no campo `image_base64`)
- Ao finalizar, frontend envia para `POST /orders`
- Pedido fica salvo no PostgreSQL para o caixa/cozinha consultar e imprimir
- Se API estiver fora do ar, o frontend salva localmente como fallback
