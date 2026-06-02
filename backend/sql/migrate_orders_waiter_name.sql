-- Nome do garçom que lançou o pedido da mesa (controle / relatório)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_name TEXT NOT NULL DEFAULT '';
