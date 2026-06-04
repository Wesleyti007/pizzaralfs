import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL } from './apiBaseUrl.js'
import {
  closeCashRegister,
  fetchCashClosePreview,
  fetchCashClosings,
  printCashClosingReceipt,
} from './cashClosing.js'
import { OrdersSummaryCards } from './OrdersSummaryCards.jsx'
import { formatOrderDateTime, formatOrderMoney } from './orders.js'

export function CashClosePanel() {
  const [preview, setPreview] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [lastClosed, setLastClosed] = useState(null)
  const [expanded, setExpanded] = useState(true)
  const [printingId, setPrintingId] = useState(null)

  const printClosing = async (payload, label = 'last') => {
    setPrintingId(label)
    setError('')
    try {
      await printCashClosingReceipt({
        closing: payload.closing ?? { id: payload.id, createdAt: payload.createdAt },
        summary: payload.summary,
        periodFrom: payload.periodFrom,
        periodTo: payload.periodTo,
        soldOrders: payload.soldOrders ?? [],
        notes: payload.notes ?? payload.closing?.notes ?? '',
      })
    } catch (printError) {
      setError(
        printError instanceof Error
          ? printError.message
          : 'Não foi possível imprimir o comprovante.',
      )
    } finally {
      setPrintingId(null)
    }
  }

  const loadPreview = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [previewData, historyData] = await Promise.all([
        fetchCashClosePreview(API_BASE_URL),
        fetchCashClosings(API_BASE_URL, 10),
      ])
      setPreview(previewData)
      setHistory(Array.isArray(historyData) ? historyData : [])
    } catch (loadError) {
      setPreview(null)
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Não foi possível carregar o fechamento de caixa.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  const handleCloseCash = async () => {
    if (closing) return
    const soldCount = preview?.summary?.soldCount ?? 0
    const confirmText =
      soldCount === 0
        ? 'Nenhuma venda neste período. Fechar o caixa mesmo assim?'
        : `Fechar caixa com ${soldCount} pedido(s) totalizando ${formatOrderMoney(preview?.summary?.soldTotal)}?`
    if (!window.confirm(confirmText)) return

    setClosing(true)
    setError('')
    try {
      const result = await closeCashRegister(API_BASE_URL, { notes })
      setLastClosed(result)
      setNotes('')
      await loadPreview()
      await printClosing(result, 'last')
    } catch (closeError) {
      setError(
        closeError instanceof Error ? closeError.message : 'Não foi possível fechar o caixa.',
      )
    } finally {
      setClosing(false)
    }
  }

  const handlePrintLast = () => {
    if (!lastClosed?.closing) return
    void printClosing(lastClosed, 'last')
  }

  const handlePrintHistory = (entry) => {
    void printClosing(entry, `history-${entry.id}`)
  }

  return (
    <section className="cash-close-panel" aria-label="Fechamento de caixa">
      <header className="cash-close-panel-head">
        <div>
          <h3>Fechamento de caixa</h3>
          <p>
            Vendas desde o último fechamento de caixa. O total só zera quando você clicar em
            &quot;Fechar caixa agora&quot; — não reseta à meia-noite.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          {expanded ? 'Recolher' : 'Expandir'}
        </button>
      </header>

      {expanded && (
        <>
          {preview && (
            <p className="cash-close-period">
              <strong>Período aberto:</strong> {formatOrderDateTime(preview.periodFrom)} até{' '}
              {formatOrderDateTime(preview.periodTo)}
            </p>
          )}

          <div className="cash-close-actions">
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              onClick={() => loadPreview()}
              disabled={loading || closing}
            >
              {loading ? 'Atualizando...' : 'Atualizar totais'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void handleCloseCash()}
              disabled={loading || closing || !preview}
            >
              {closing ? 'Fechando...' : 'Fechar caixa agora'}
            </button>
          </div>

          <label className="cash-close-notes field-full">
            <span className="field-label">Observação do fechamento (opcional)</span>
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: turno noite, responsável João"
              maxLength={200}
            />
          </label>

          {error && <p className="orders-page-error">{error}</p>}

          {loading && !preview && !error && (
            <p className="report-table-empty">Carregando fechamento...</p>
          )}

          {preview?.summary && <OrdersSummaryCards summary={preview.summary} />}

          {lastClosed?.closing && (
            <div className="cash-close-done">
              <p>
                Caixa fechado #{lastClosed.closing.id} às{' '}
                {formatOrderDateTime(lastClosed.closing.createdAt)} —{' '}
                {formatOrderMoney(lastClosed.summary?.soldTotal)} em{' '}
                {lastClosed.summary?.soldCount ?? 0} pedido(s).
              </p>
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={handlePrintLast}
                disabled={printingId === 'last'}
              >
                {printingId === 'last' ? 'Imprimindo...' : 'Imprimir comprovante'}
              </button>
            </div>
          )}

          <button
            type="button"
            className="cash-close-history-toggle"
            onClick={() => setShowHistory((current) => !current)}
          >
            {showHistory ? 'Ocultar histórico' : 'Ver fechamentos anteriores'}
          </button>

          {showHistory && (
            <div className="cash-close-history">
              {history.length === 0 ? (
                <p className="report-table-empty">Nenhum fechamento registrado ainda.</p>
              ) : (
                <ul className="cash-close-history-list">
                  {history.map((entry) => (
                    <li key={entry.id}>
                      <div className="cash-close-history-row">
                        <span>
                          <strong>#{entry.id}</strong> · {formatOrderDateTime(entry.periodFrom)} →{' '}
                          {formatOrderDateTime(entry.periodTo)} ·{' '}
                          {formatOrderMoney(entry.summary?.soldTotal)} ({entry.summary?.soldCount ?? 0}{' '}
                          pedidos)
                          {entry.notes ? ` · ${entry.notes}` : ''}
                        </span>
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost cash-close-history-print"
                          onClick={() => handlePrintHistory(entry)}
                          disabled={printingId === `history-${entry.id}`}
                        >
                          {printingId === `history-${entry.id}` ? '...' : 'Imprimir'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
