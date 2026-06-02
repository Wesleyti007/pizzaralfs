import { query } from './db.js'

/** Colunas que o código espera mas podem faltar em bancos antigos. */
const SCHEMA_PATCHES = [
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb`,
]

export async function ensureOrderSchema() {
  for (const sql of SCHEMA_PATCHES) {
    await query(sql)
  }
}
