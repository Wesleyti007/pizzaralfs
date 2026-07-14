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

export function ReportCharts({ insights }) {
  if (!insights) return null

  const topItems = insights.topItems || []
  const bottomItems = insights.bottomItems || []
  const byDay = insights.byDay || []
  const hasAny =
    topItems.length > 0 || bottomItems.length > 0 || byDay.length > 0 ||
    (insights.byChannel?.table?.count || 0) + (insights.byChannel?.delivery?.count || 0) > 0

  if (!hasAny) {
    return (
      <section className="report-charts" aria-label="Gráficos do período">
        <p className="report-chart-empty">Sem dados suficientes para gráficos neste período.</p>
      </section>
    )
  }

  const topMax = maxOf(topItems, 'qty')
  const bottomMax = maxOf(bottomItems, 'qty')
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
        <p>O que mais e menos saiu, canais e faturamento por dia no período filtrado.</p>
      </header>

      <div className="report-charts-grid">
        <article className="report-chart-card">
          <h4>Mais vendidos</h4>
          {topItems.length ? (
            <HorizontalBars
              rows={topItems}
              valueKey="qty"
              maxValue={topMax}
              tone="primary"
              formatValue={(row) => `${row.qty} · ${formatOrderMoney(row.revenue)}`}
            />
          ) : (
            <p className="report-chart-empty">Nenhum item vendido.</p>
          )}
        </article>

        <article className="report-chart-card">
          <h4>Menos vendidos</h4>
          {bottomItems.length ? (
            <HorizontalBars
              rows={bottomItems}
              valueKey="qty"
              maxValue={bottomMax || topMax}
              tone="muted"
              formatValue={(row) => `${row.qty} · ${formatOrderMoney(row.revenue)}`}
            />
          ) : (
            <p className="report-chart-empty">Poucos itens distintos para comparar.</p>
          )}
        </article>

        <article className="report-chart-card">
          <h4>Mesa × Delivery</h4>
          <ChannelSplit byChannel={insights.byChannel} />
        </article>

        <article className="report-chart-card report-chart-card--wide">
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
    </section>
  )
}
