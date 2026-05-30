-- Garante coluna de status nos pedidos (cancelado, impresso, etc.)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

UPDATE orders
SET status = 'pending'
WHERE status IS NULL OR trim(status) = '';
