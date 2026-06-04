#!/usr/bin/env node
/**
 * Consolida fechamentos duplicados em um único registro.
 * Rode no servidor: docker compose exec app node scripts/consolidate-cash-closings.mjs --apply --ids=1,2
 */
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildOrdersSummary,
  fetchOrdersInRange,
} from '../src/cashClosing.js'
import { pool, query } from '../src/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

function parseArgs(argv) {
  const apply = argv.includes('--apply')
  let count = 3
  let hours = 72
  let ids = null
  for (const arg of argv) {
    if (arg.startsWith('--count=')) count = Number(arg.slice(8)) || 3
    if (arg.startsWith('--hours=')) hours = Number(arg.slice(8)) || 72
    if (arg.startsWith('--ids=')) {
      ids = arg
        .slice(6)
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isInteger(id) && id > 0)
    }
  }
  return { apply, count, hours, ids }
}

async function getYesterdayStartBrazil() {
  const result = await query(
    `SELECT ((date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo') - interval '1 day')
      AT TIME ZONE 'America/Sao_Paulo')::timestamptz AS start`,
  )
  return result.rows[0]?.start
}

async function loadBatch({ count, hours, ids }) {
  if (ids?.length) {
    const result = await query(
      `SELECT id, period_from AS "periodFrom", period_to AS "periodTo",
              summary, notes, created_at AS "createdAt"
       FROM cash_closings WHERE id = ANY($1::bigint[])
       ORDER BY period_to ASC`,
      [ids],
    )
    return result.rows
  }

  const result = await query(
    `SELECT id, period_from AS "periodFrom", period_to AS "periodTo",
            summary, notes, created_at AS "createdAt"
     FROM cash_closings
     WHERE created_at >= NOW() - ($1::text || ' hours')::interval
     ORDER BY period_to DESC
     LIMIT $2`,
    [String(hours), count],
  )
  return [...result.rows].reverse()
}

async function resolvePeriodFrom(batch) {
  const first = batch[0]
  const before = await query(
    `SELECT period_to AS "periodTo"
     FROM cash_closings
     WHERE period_to < $1::timestamptz
     ORDER BY period_to DESC
     LIMIT 1`,
    [first.periodFrom],
  )
  const lastGood = before.rows[0]?.periodTo ? new Date(before.rows[0].periodTo) : null
  const yesterdayStart = await getYesterdayStartBrazil()
  const yesterday = yesterdayStart ? new Date(yesterdayStart) : null

  if (lastGood && yesterday) {
    return lastGood.getTime() < yesterday.getTime() ? lastGood : yesterday
  }
  return lastGood || yesterday || new Date(first.periodFrom)
}

async function main() {
  const { apply, count, hours, ids } = parseArgs(process.argv.slice(2))
  const batch = await loadBatch({ count, hours, ids })

  if (batch.length < 2) {
    console.log('Nada a consolidar: precisa de pelo menos 2 fechamentos no lote.')
    await pool.end()
    process.exit(1)
  }

  const periodFrom = await resolvePeriodFrom(batch)
  const periodTo = new Date(batch[batch.length - 1].periodTo)
  const orders = await fetchOrdersInRange(query, periodFrom, periodTo)
  const summary = buildOrdersSummary(orders)
  const batchIds = batch.map((row) => row.id)

  console.log('--- Consolidar fechamentos ---')
  console.log('Modo:', apply ? 'APLICAR' : 'dry-run (use --apply para gravar)')
  console.log('Fechamentos no lote:', batchIds.join(', '))
  console.log('Período consolidado:')
  console.log('  De:', periodFrom.toISOString())
  console.log('  Até:', periodTo.toISOString())
  console.log('Pedidos no período:', orders.length)
  console.log('Vendas:', summary.soldCount, 'pedidos · R$', summary.soldTotal.toFixed(2))

  if (!apply) {
    console.log('\nRode com --apply para apagar o lote e criar 1 fechamento único.')
    await pool.end()
    return
  }

  await query('BEGIN')
  try {
    await query(`DELETE FROM cash_closings WHERE id = ANY($1::bigint[])`, [batchIds])
    const inserted = await query(
      `INSERT INTO cash_closings (period_from, period_to, summary, notes)
       VALUES ($1, $2, $3::jsonb, $4)
       RETURNING id`,
      [
        periodFrom,
        periodTo,
        JSON.stringify(summary),
        'Consolidado (correção fechamentos duplicados / meia-noite)',
      ],
    )
    await query('COMMIT')
    console.log('\nOK — fechamento consolidado #' + inserted.rows[0].id)
  } catch (error) {
    await query('ROLLBACK')
    throw error
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  pool.end().finally(() => process.exit(1))
})
