-- Forma de pagamento no delivery (PIX, dinheiro, cartão, etc.)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_change_for NUMERIC(10,2);
