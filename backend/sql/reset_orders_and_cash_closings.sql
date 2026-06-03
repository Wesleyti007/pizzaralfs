-- Apaga TODOS os pedidos (itens em cascata) e TODOS os fechamentos de caixa.
-- Não altera cardápio, categorias nem configurações.
--
-- Produção:
--   cd /opt/pizza-ralfs/deploy
--   docker compose exec -T db psql -U pizzaralfs -d pizzaralfs -v ON_ERROR_STOP=1 \
--     < ../backend/sql/reset_orders_and_cash_closings.sql
--
-- Local:
--   psql postgresql://postgres:postgres@localhost:5432/pizzaralfs -f backend/sql/reset_orders_and_cash_closings.sql

BEGIN;

TRUNCATE TABLE order_items, orders RESTART IDENTITY CASCADE;

TRUNCATE TABLE cash_closings RESTART IDENTITY;

COMMIT;

SELECT 'orders' AS tabela, COUNT(*) AS registros FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'cash_closings', COUNT(*) FROM cash_closings;
