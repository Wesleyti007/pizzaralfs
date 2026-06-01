ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS min_order_qty INTEGER NOT NULL DEFAULT 1;

ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_min_order_qty_check;
ALTER TABLE menu_items ADD CONSTRAINT menu_items_min_order_qty_check
  CHECK (min_order_qty >= 1 AND min_order_qty <= 99);
