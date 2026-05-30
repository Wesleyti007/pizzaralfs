import { useMemo } from 'react'
import {
  distributeFlavorSlices,
  getMaxFlavorsForSize,
  PIZZA_FLAVOR_COLORS,
} from './catalog.js'

function slicePath(cx, cy, radius, index, total) {
  const start = -Math.PI / 2 + (index * 2 * Math.PI) / total
  const end = start + (2 * Math.PI) / total
  const x1 = cx + radius * Math.cos(start)
  const y1 = cy + radius * Math.sin(start)
  const x2 = cx + radius * Math.cos(end)
  const y2 = cy + radius * Math.sin(end)
  const large = (2 * Math.PI) / total > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`
}

export function PizzaSlicePicker({
  sizeId,
  pieceCount,
  primaryFlavor,
  selectedFlavors,
  otherPizzaOptions,
  onAddFlavor,
  onRemoveFlavor,
  normalizeItemId,
  sameItemId,
}) {
  const maxFlavors = getMaxFlavorsForSize(sizeId)
  const canAddMore = selectedFlavors.length < maxFlavors && otherPizzaOptions.length > 0
  const showMulti = maxFlavors > 1

  const sliceOwners = useMemo(
    () => distributeFlavorSlices(pieceCount, selectedFlavors.length),
    [pieceCount, selectedFlavors.length],
  )

  const flavorSignature = selectedFlavors.map((f) => normalizeItemId(f.id)).join('-')
  const filledCount = selectedFlavors.length

  const availableOptions = otherPizzaOptions.filter(
    (item) => !selectedFlavors.some((flavor) => sameItemId(flavor.id, item.id)),
  )

  const pizzaVisual = (
    <div
      className="pizza-slice-visual"
      key={`pizza-viz-${pieceCount}-${flavorSignature}`}
      aria-hidden="true"
    >
      <div className="pizza-slice-plate">
        <svg viewBox="0 0 200 200" className="pizza-slice-svg">
          <defs>
            <radialGradient id="pizza-cheese-base" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#fff8e8" />
              <stop offset="100%" stopColor="#f0d9a8" />
            </radialGradient>
            <filter id="pizza-slice-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.25" />
            </filter>
          </defs>
          <circle cx="100" cy="100" r="94" className="pizza-slice-shadow" />
          <circle cx="100" cy="100" r="92" className="pizza-slice-crust" />
          <g className="pizza-slice-layer" filter="url(#pizza-slice-glow)">
            {Array.from({ length: pieceCount }, (_, index) => {
              const flavorIndex = sliceOwners[index] ?? 0
              const fill = PIZZA_FLAVOR_COLORS[flavorIndex % PIZZA_FLAVOR_COLORS.length]
              const isFilled = filledCount > 0
              return (
                <g
                  key={`slice-g-${index}-${flavorIndex}-${filledCount}`}
                  className={`pizza-slice-group${isFilled ? ' pizza-slice-group--filled' : ''}`}
                  style={{ '--slice-delay': `${index * 70}ms`, '--slice-fill': fill }}
                >
                  <path
                    d={slicePath(100, 100, 88, index, pieceCount)}
                    className="pizza-slice-part"
                  />
                  <path
                    d={slicePath(100, 100, 72, index, pieceCount)}
                    className="pizza-slice-cheese"
                  />
                </g>
              )
            })}
          </g>
          <circle cx="100" cy="100" r="14" className="pizza-slice-center" />
          <circle cx="100" cy="100" r="6" className="pizza-slice-center-dot" />
        </svg>
      </div>
      <p className="pizza-slice-caption">
        {pieceCount} pedaços
        {filledCount > 1 ? ` · ${filledCount} sabores` : ' · 1 sabor'}
      </p>
    </div>
  )

  return (
    <div className="pizza-slice-picker">
      {showMulti ? (
        <>
          {pizzaVisual}

          <div className="pizza-flavor-chips">
            <span className="pizza-sizes-label">Sabores</span>
            <ul className="pizza-flavor-chip-list">
              {selectedFlavors.map((flavor, index) => (
                <li
                  key={normalizeItemId(flavor.id)}
                  className="pizza-flavor-chip"
                  style={{
                    '--chip-color': PIZZA_FLAVOR_COLORS[index % PIZZA_FLAVOR_COLORS.length],
                    '--chip-delay': `${index * 80}ms`,
                  }}
                >
                  <span className="pizza-flavor-chip-dot" aria-hidden="true" />
                  <span className="pizza-flavor-chip-name">{flavor.name}</span>
                  {!sameItemId(flavor.id, primaryFlavor.id) && (
                    <button
                      type="button"
                      className="pizza-flavor-chip-remove"
                      aria-label={`Remover ${flavor.name}`}
                      onClick={() => onRemoveFlavor(flavor.id)}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {canAddMore && (
            <div className="pizza-add-flavor">
              <label className="pizza-half-flavor-label" htmlFor="pizza-add-flavor-select">
                Adicionar sabor ({selectedFlavors.length}/{maxFlavors})
              </label>
              <select
                id="pizza-add-flavor-select"
                className="pizza-half-flavor-select"
                defaultValue=""
                onChange={(event) => {
                  const value = event.target.value
                  if (!value) return
                  onAddFlavor(value)
                  event.target.value = ''
                }}
              >
                <option value="">Escolha outro sabor</option>
                {availableOptions.map((item) => (
                  <option key={item.id} value={normalizeItemId(item.id)}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="pizza-half-hint">
                {sizeId === 'media'
                  ? 'Média: até 2 sabores. Cobrado o valor do sabor mais caro.'
                  : 'Grande: até 4 sabores. Cobrado o valor do sabor mais caro.'}
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div
            className="pizza-slice-visual pizza-slice-visual--broto"
            key={`broto-${normalizeItemId(primaryFlavor.id)}`}
            aria-hidden="true"
          >
            <div className="pizza-slice-plate">
              <svg viewBox="0 0 200 200" className="pizza-slice-svg">
                <circle cx="100" cy="100" r="94" className="pizza-slice-shadow" />
                <circle cx="100" cy="100" r="92" className="pizza-slice-crust" />
                <g className="pizza-slice-layer pizza-slice-layer--broto">
                  {Array.from({ length: pieceCount }, (_, index) => (
                    <g
                      key={`broto-slice-${index}`}
                      className="pizza-slice-group pizza-slice-group--filled"
                      style={{
                        '--slice-delay': `${index * 65}ms`,
                        '--slice-fill': PIZZA_FLAVOR_COLORS[0],
                      }}
                    >
                      <path
                        d={slicePath(100, 100, 88, index, pieceCount)}
                        className="pizza-slice-part"
                      />
                    </g>
                  ))}
                </g>
                <circle cx="100" cy="100" r="14" className="pizza-slice-center" />
              </svg>
            </div>
          </div>
          <p className="pizza-half-hint pizza-half-hint--broto">
            Broto: apenas um sabor (esta pizza inteira).
          </p>
        </>
      )}
    </div>
  )
}
