import { query } from './db.js'

/** Colunas que o código espera mas podem faltar em bancos antigos. */
const ORDER_COLUMN_PATCHES = [
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_name TEXT NOT NULL DEFAULT ''`,
]

export async function ensureOrderSchema() {
  for (const sql of ORDER_COLUMN_PATCHES) {
    await query(sql)
  }
}
