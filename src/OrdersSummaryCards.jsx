import { paymentMethodLabel } from './cashClosing.js'
import { formatOrderMoney } from './orders.js'

/** Resumo de vendas (mesas, delivery, pagamentos) — igual ao fechamento de caixa. */
export function OrdersSummaryCards({ summary, className = 'cash-close-summary' }) {
  if (!summary) return null

  const paymentEntries = Object.entries(summary.paymentMethods || {})

  return (
    <div className={className}>
      <article className="reports-summary-card reports-summary-card--sold cash-close-summary-card">
        <span className="reports-summary-label">Total vendido</span>
        <strong className="reports-summary-value">{summary.soldCount}</strong>
        <span className="reports-summary-money">{formatOrderMoney(summary.soldTotal)}</span>
      </article>
      <article className="cash-close-summary-card cash-close-summary-card--split">
        <span className="reports-summary-label">Mesas</span>
        <strong>{summary.tableCount} pedidos</strong>
        <span>{formatOrderMoney(summary.tableTotal)}</span>
      </article>
      <article className="cash-close-summary-card cash-close-summary-card--split">
        <span className="reports-summary-label">Delivery</span>
        <strong>{summary.deliveryCount} pedidos</strong>
        <span>{formatOrderMoney(summary.deliveryTotal)}</span>
      </article>
      <article className="cash-close-summary-card cash-close-summary-card--split">
        <span className="reports-summary-label">Taxas entrega</span>
        <strong>{formatOrderMoney(summary.deliveryFeesTotal)}</strong>
      </article>
      <article className="reports-summary-card reports-summary-card--cancelled cash-close-summary-card">
        <span className="reports-summary-label">Cancelados</span>
        <strong className="reports-summary-value">{summary.cancelledCount}</strong>
        <span className="reports-summary-money">{formatOrderMoney(summary.cancelledTotal)}</span>
      </article>
      {paymentEntries.length > 0 && (
        <article className="cash-close-summary-card cash-close-summary-card--wide">
          <span className="reports-summary-label">Pagamentos (delivery)</span>
          <ul className="cash-close-payment-list">
            {paymentEntries.map(([method, stats]) => (
              <li key={method}>
                {paymentMethodLabel(method)}: {stats.count} · {formatOrderMoney(stats.total)}
              </li>
            ))}
          </ul>
        </article>
      )}
    </div>
  )
}
