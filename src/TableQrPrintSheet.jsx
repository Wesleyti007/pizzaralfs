import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const PRODUCTION_SITE = 'https://pizzaralfs.com.br'

/** URL do cardápio no QR (em localhost usa o site publicado). */
export function resolveTableQrBaseUrl() {
  if (typeof window === 'undefined') return PRODUCTION_SITE
  const origin = window.location.origin
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return PRODUCTION_SITE
  }
  return origin.replace(/\/$/, '')
}

export function tableQrUrl(baseUrl, tableNumber) {
  const root = String(baseUrl || PRODUCTION_SITE).replace(/\/$/, '')
  return `${root}/?mesa=${encodeURIComponent(String(tableNumber))}`
}

export function TableQrPrintSheet({ tables, showToolbar = true }) {
  const [baseUrl, setBaseUrl] = useState(() => resolveTableQrBaseUrl())
  const sortedTables = useMemo(
    () => [...tables].sort((a, b) => Number(a) - Number(b)),
    [tables],
  )

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {showToolbar ? (
        <div className="qr-page-toolbar no-print">
          <div className="qr-page-toolbar-text">
            <h2>QR Codes das mesas — impressão A4</h2>
            <p>
              Layout <strong>4 por linha</strong>, pronto para imprimir e recortar/colar nas mesas.
              Confira o link abaixo antes de imprimir.
            </p>
          </div>
          <div className="qr-page-toolbar-actions">
            <label className="qr-page-url-field">
              <span>Link no QR</span>
              <input
                type="url"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value.trim())}
                placeholder="https://pizzaralfs.com.br"
              />
            </label>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={handlePrint}
              disabled={sortedTables.length === 0}
            >
              Imprimir folha A4
            </button>
          </div>
        </div>
      ) : null}

      {sortedTables.length === 0 ? (
        <p className="qr-page-empty no-print">Cadastre mesas no admin para gerar os QR Codes.</p>
      ) : null}

      <div className="qr-print-sheet" aria-label="Folha de QR Codes para mesas">
        {sortedTables.map((tableNum) => {
          const url = tableQrUrl(baseUrl, tableNum)
          return (
            <article key={tableNum} className="qr-print-cell">
              <p className="qr-print-cell__brand">Pizza Ralf&apos;s</p>
              <h3 className="qr-print-cell__mesa">Mesa {tableNum}</h3>
              <div className="qr-print-cell__code-wrap">
                <QRCodeSVG
                  value={url}
                  size={280}
                  level="M"
                  includeMargin
                  className="qr-print-cell__code"
                />
              </div>
              <p className="qr-print-cell__hint">Escaneie e faça seu pedido</p>
            </article>
          )
        })}
      </div>
    </>
  )
}

export function TableQrPrintPage({ tables }) {
  return (
    <section className="qr-page">
      <TableQrPrintSheet tables={tables} />
    </section>
  )
}
