ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(is_active);
