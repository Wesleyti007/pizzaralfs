-- Liga/desliga pedidos pelo cardápio (loja aberta ou fechada)
ALTER TABLE catalog_settings
  ADD COLUMN IF NOT EXISTS orders_open BOOLEAN NOT NULL DEFAULT TRUE;
