import { useEffect, useMemo, useState } from 'react'
import { formatOrderMoney } from './orders.js'

function maxOf(rows, field) {
  return rows.reduce((max, row) => Math.max(max, Number(row[field]) || 0), 0)
}

function formatDayLabel(isoDate) {
  if (!isoDate) return '—'
  const [year, month, day] = String(isoDate).split('-')
  if (!year || !month || !day) return isoDate
  return `${day}/${month}`
}

function HorizontalBars({ rows, valueKey, maxValue, formatValue, tone = 'primary' }) {
  if (!rows?.length) return null
  const ceiling = maxValue > 0 ? maxValue : 1

  return (
    <ul className="report-chart-bars">
      {rows.map((row) => {
        const value = Number(row[valueKey]) || 0
        const pct = Math.max(4, Math.round((value / ceiling) * 100))
        return (
          <li key={row.key || row.name || row.date} className="report-chart-bar-row">
            <div className="report-chart-bar-head">
              <span className="report-chart-bar-label" title={row.name || row.label}>
                {row.name || row.label}
              </span>
              <span className="report-chart-bar-meta">{formatValue(row)}</span>
            </div>
            <div className="report-chart-bar-track" aria-hidden="true">
              <span
                className={`report-chart-bar-fill report-chart-bar-fill--${tone}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function ChannelSplit({ byChannel }) {
  const tableTotal = Number(byChannel?.table?.total) || 0
  const deliveryTotal = Number(byChannel?.delivery?.total) || 0
  const tableCount = Number(byChannel?.table?.count) || 0
  const deliveryCount = Number(byChannel?.delivery?.count) || 0
  const sum = tableTotal + deliveryTotal
  if (sum <= 0 && tableCount + deliveryCount === 0) {
    return <p className="report-chart-empty">Sem vendas no período.</p>
  }

  const tablePct = sum > 0 ? Math.round((tableTotal / sum) * 100) : 0
  const deliveryPct = sum > 0 ? 100 - tablePct : 0

  return (
    <div className="report-channel-chart">
      <div className="report-channel-track" role="img" aria-label="Distribuição mesa e delivery">
        {tablePct > 0 ? (
          <span className="report-channel-segment report-channel-segment--table" style={{ width: `${tablePct}%` }} />
        ) : null}
        {deliveryPct > 0 ? (
          <span
            className="report-channel-segment report-channel-segment--delivery"
            style={{ width: `${deliveryPct}%` }}
          />
        ) : null}
      </div>
      <ul className="report-channel-legend">
        <li>
          <span className="report-channel-dot report-channel-dot--table" />
          Mesa · {tableCount} ped. · {formatOrderMoney(tableTotal)} ({tablePct}%)
        </li>
        <li>
          <span className="report-channel-dot report-channel-dot--delivery" />
          Delivery · {deliveryCount} ped. · {formatOrderMoney(deliveryTotal)} ({deliveryPct}%)
        </li>
      </ul>
    </div>
  )
}

function CategoryItemsBlock({ group }) {
  const items = group.items?.length ? group.items : group.topItems || []
  const maxQty = maxOf(items, 'qty')
  const hasItems = items.length > 0
  const soldQty = group.qty || 0

  return (
    <article className="report-chart-card report-chart-card--wide report-category-block">
      <div className="report-category-block-head">
        <h4>{group.label}</h4>
        <p>
          {soldQty > 0
            ? `${soldQty} un. · ${formatOrderMoney(group.revenue)} · ${group.itemCount} ${
                group.itemCount === 1 ? 'item' : 'itens'
              }`
            : hasItems
              ? `0 un. · ${group.itemCount} ${group.itemCount === 1 ? 'item' : 'itens'} no cardápio`
              : 'Sem itens no cardápio'}
        </p>
      </div>
      {!hasItems ? (
        <p className="report-chart-empty">Nenhum item ativo nesta categoria.</p>
      ) : (
        <div>
          <h5>Ranking completo (mais → menos, incl. sem venda)</h5>
          <HorizontalBars
            rows={items.map((row) => ({
              ...row,
              key: row.id != null ? `item-${row.id}` : `name-${row.name}`,
            }))}
            valueKey="qty"
            maxValue={maxQty}
            tone="primary"
            formatValue={(row) =>
              (row.qty || 0) > 0
                ? `${row.qty} · ${formatOrderMoney(row.revenue)}`
                : '0 · sem vendas'
            }
          />
        </div>
      )}
    </article>
  )
}

export function ReportCharts({ insights }) {
  const [categoryFilter, setCategoryFilter] = useState('all')

  const byCategory = insights?.byCategory || []
  const topItems = insights?.topItems || []
  const bottomItems = insights?.bottomItems || []
  const byDay = insights?.byDay || []

  useEffect(() => {
    if (categoryFilter === 'all') return
    if (!byCategory.some((group) => group.category === categoryFilter)) {
      setCategoryFilter('all')
    }
  }, [byCategory, categoryFilter])

  const filteredCategories = useMemo(() => {
    if (categoryFilter === 'all') return byCategory
    return byCategory.filter((group) => group.category === categoryFilter)
  }, [byCategory, categoryFilter])

  if (!insights) return null

  const hasAny =
    topItems.length > 0 ||
    bottomItems.length > 0 ||
    byCategory.length > 0 ||
    byDay.length > 0 ||
    (insights.byChannel?.table?.count || 0) + (insights.byChannel?.delivery?.count || 0) > 0

  if (!hasAny) {
    return (
      <section className="report-charts" aria-label="Gráficos do período">
        <p className="report-chart-empty">Sem dados suficientes para gráficos neste período.</p>
      </section>
    )
  }

  const categoryMax = maxOf(byCategory, 'qty')
  const dayMax = maxOf(byDay, 'total')
  const dayRows = byDay.map((row) => ({
    ...row,
    key: row.date,
    name: formatDayLabel(row.date),
    label: formatDayLabel(row.date),
  }))

  return (
    <section className="report-charts" aria-label="Gráficos do período">
      <header className="report-charts-header">
        <h3>Visão rápida</h3>
        <p>
          Ranking dinâmico por categoria do cardápio (todos os itens: mais, meio e menos
          vendidos). Categorias novas entram sozinhas. Também mostra canais e faturamento por
          dia.
        </p>
      </header>

      <div className="report-charts-grid">
        <article className="report-chart-card report-chart-card--wide">
          <h4>Vendas por categoria</h4>
          {byCategory.length ? (
            <HorizontalBars
              rows={byCategory.map((group) => ({
                ...group,
                key: group.category,
                name: group.label,
              }))}
              valueKey="qty"
              maxValue={Math.max(categoryMax, 1)}
              tone="gold"
              formatValue={(row) =>
                (row.qty || 0) > 0
                  ? `${row.qty} un. · ${formatOrderMoney(row.revenue)}`
                  : '0 un. · sem vendas'
              }
            />
          ) : (
            <p className="report-chart-empty">Nenhuma categoria no cardápio.</p>
          )}
        </article>

        <article className="report-chart-card">
          <h4>Mesa × Delivery</h4>
          <ChannelSplit byChannel={insights.byChannel} />
        </article>

        <article className="report-chart-card">
          <h4>Faturamento por dia</h4>
          {dayRows.length ? (
            <HorizontalBars
              rows={dayRows}
              valueKey="total"
              maxValue={dayMax}
              tone="gold"
              formatValue={(row) => `${row.count} ped. · ${formatOrderMoney(row.total)}`}
            />
          ) : (
            <p className="report-chart-empty">Sem vendas diárias no período.</p>
          )}
        </article>
      </div>

      {byCategory.length > 0 ? (
        <div className="report-category-section">
          <div className="report-category-section-head">
            <h3>Ranking por categoria</h3>
            <div className="report-category-filters" role="tablist" aria-label="Filtrar categoria">
              <button
                type="button"
                role="tab"
                aria-selected={categoryFilter === 'all'}
                className={
                  categoryFilter === 'all'
                    ? 'report-category-filter is-active'
                    : 'report-category-filter'
                }
                onClick={() => setCategoryFilter('all')}
              >
                Todas
              </button>
              {byCategory.map((group) => (
                <button
                  key={group.category}
                  type="button"
                  role="tab"
                  aria-selected={categoryFilter === group.category}
                  className={
                    categoryFilter === group.category
                      ? 'report-category-filter is-active'
                      : 'report-category-filter'
                  }
                  onClick={() => setCategoryFilter(group.category)}
                >
                  {group.label}
                  {(group.qty || 0) === 0 ? ' · 0' : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="report-category-blocks">
            {filteredCategories.map((group) => (
              <CategoryItemsBlock key={group.category} group={group} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
