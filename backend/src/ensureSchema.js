import { query } from './db.js'

/** Colunas que o código espera mas podem faltar em bancos antigos. */
const SCHEMA_PATCHES = [
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE catalog_settings ADD COLUMN IF NOT EXISTS orders_open BOOLEAN NOT NULL DEFAULT TRUE`,
  `ALTER TABLE catalog_settings ADD COLUMN IF NOT EXISTS pizza_enabled_sizes JSONB NOT NULL DEFAULT '["broto","media","grande"]'::jsonb`,
  `ALTER TABLE catalog_settings ADD COLUMN IF NOT EXISTS calzone_enabled_sizes JSONB NOT NULL DEFAULT '["pequeno","grande"]'::jsonb`,
  `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS extras JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_rev TEXT NOT NULL DEFAULT ''`,
]

const IMAGE_REV_BACKFILL = `
UPDATE menu_items
SET image_rev = left(md5(image_base64), 12)
WHERE length(trim(COALESCE(image_base64, ''))) > 32
  AND trim(COALESCE(image_rev, '')) = ''
`

const CASH_CLOSINGS_TABLE = `
CREATE TABLE IF NOT EXISTS cash_closings (
  id BIGSERIAL PRIMARY KEY,
  period_from TIMESTAMPTZ NOT NULL,
  period_to TIMESTAMPTZ NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cash_closings_created_at ON cash_closings(created_at DESC);
`

export async function ensureOrderSchema() {
  for (const sql of SCHEMA_PATCHES) {
    await query(sql)
  }
  await query(CASH_CLOSINGS_TABLE)
  await query(IMAGE_REV_BACKFILL)
}
