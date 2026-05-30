-- Taxa de entrega global, preços delivery nos produtos e totais no pedido
ALTER TABLE catalog_settings ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS delivery_price NUMERIC(10,2);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0;
