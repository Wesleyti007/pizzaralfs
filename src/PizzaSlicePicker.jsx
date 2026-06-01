import { useMemo, useState } from 'react'
import {
  distributeFlavorSlices,
  getMaxFlavorsForSize,
  groupPizzaFlavorOptions,
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

function filterFlavorOptionsBySearch(items, query) {
  const trimmed = String(query || '').trim().toLowerCase()
  if (!trimmed) return items
  return items.filter((item) => item.name.toLowerCase().includes(trimmed))
}

function PizzaFlavorQuickPick({
  savoryOptions,
  sweetOptions,
  onPick,
  normalizeItemId,
  pickerId,
}) {
  const [search, setSearch] = useState('')
  const filteredSavory = useMemo(
    () => filterFlavorOptionsBySearch(savoryOptions, search),
    [savoryOptions, search],
  )
  const filteredSweet = useMemo(
    () => filterFlavorOptionsBySearch(sweetOptions, search),
    [sweetOptions, search],
  )
  const hasResults = filteredSavory.length > 0 || filteredSweet.length > 0
  const showSearch = savoryOptions.length + sweetOptions.length > 8

  const renderGroup = (label, items) => {
    if (!items.length) return null
    return (
      <div className="pizza-flavor-quick-group">
        <span className="pizza-flavor-quick-group-label">{label}</span>
        <ul className="pizza-flavor-quick-list">
          {items.map((item) => (
            <li key={normalizeItemId(item.id)}>
              <button
                type="button"
                className="pizza-flavor-quick-btn"
                onClick={() => {
                  onPick(normalizeItemId(item.id))
                  setSearch('')
                }}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="pizza-flavor-quick-pick">
      {showSearch && (
        <input
          type="search"
          className="pizza-flavor-quick-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar sabor..."
          aria-controls={pickerId}
          enterKeyHint="search"
          autoComplete="off"
        />
      )}
      <div id={pickerId} className="pizza-flavor-quick-scroll" role="listbox" aria-label="Sabores disponíveis">
        {renderGroup('Pizzas salgadas', filteredSavory)}
        {renderGroup('Pizzas doces', filteredSweet)}
        {!hasResults && (
          <p className="pizza-flavor-quick-empty">Nenhum sabor encontrado.</p>
        )}
      </div>
    </div>
  )
}

export function PizzaSlicePicker({
  sizeId,
  pieceCount,
  primaryFlavor,
  selectedFlavors,
  otherPizzaOptions,
  categories = [],
  onAddFlavor,
  onRemoveFlavor,
  normalizeItemId,
  sameItemId,
}) {
  const maxFlavors = getMaxFlavorsForSize(sizeId)
  const canAddMore = selectedFlavors.length < maxFlavors && otherPizzaOptions.length > 0
  const showMulti = maxFlavors > 1
  const showAnimatedPizza = sizeId === 'media' || sizeId === 'grande'

  const sliceOwners = useMemo(
    () => distributeFlavorSlices(pieceCount, selectedFlavors.length),
    [pieceCount, selectedFlavors.length],
  )

  const filledCount = selectedFlavors.length

  const availableOptions = useMemo(
    () =>
      otherPizzaOptions.filter(
        (item) => !selectedFlavors.some((flavor) => sameItemId(flavor.id, item.id)),
      ),
    [otherPizzaOptions, selectedFlavors, sameItemId],
  )
  const { savory: savoryOptions, sweet: sweetOptions } = useMemo(
    () => groupPizzaFlavorOptions(availableOptions, categories),
    [availableOptions, categories],
  )

  const pizzaVisual = (
    <div
      className="pizza-slice-visual"
      key={`pizza-viz-${pieceCount}`}
      aria-hidden="true"
    >
      <div className="pizza-slice-plate">
        <svg viewBox="0 0 200 200" className="pizza-slice-svg">
          <defs>
            <radialGradient id="pizza-cheese-base" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#fff8e8" />
              <stop offset="100%" stopColor="#f0d9a8" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="94" className="pizza-slice-shadow" />
          <circle cx="100" cy="100" r="92" className="pizza-slice-crust" />
          <g className="pizza-slice-layer">
            {Array.from({ length: pieceCount }, (_, index) => {
              const flavorIndex = sliceOwners[index] ?? 0
              const fill = PIZZA_FLAVOR_COLORS[flavorIndex % PIZZA_FLAVOR_COLORS.length]
              const isFilled = filledCount > 0
              return (
                <g
                  key={`slice-g-${index}-${flavorIndex}-${filledCount}`}
                  className={`pizza-slice-group${isFilled ? ' pizza-slice-group--filled' : ''}`}
                  style={{ '--slice-delay': `${index * 24}ms`, '--slice-fill': fill }}
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
          {showAnimatedPizza && pizzaVisual}

          <div className="pizza-flavor-chips">
            <span className="pizza-sizes-label">Sabores</span>
            <ul className="pizza-flavor-chip-list">
              {selectedFlavors.map((flavor, index) => (
                <li
                  key={normalizeItemId(flavor.id)}
                  className="pizza-flavor-chip"
                  style={{
                    '--chip-color': PIZZA_FLAVOR_COLORS[index % PIZZA_FLAVOR_COLORS.length],
                    '--chip-delay': `${index * 30}ms`,
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
              <p className="pizza-half-flavor-label" id="pizza-add-flavor-label">
                Adicionar sabor ({selectedFlavors.length}/{maxFlavors})
              </p>
              <PizzaFlavorQuickPick
                pickerId="pizza-add-flavor-list"
                savoryOptions={savoryOptions}
                sweetOptions={sweetOptions}
                normalizeItemId={normalizeItemId}
                onPick={onAddFlavor}
              />
              <p className="pizza-half-hint">
                {sizeId === 'media'
                  ? 'Média: até 2 sabores (pode misturar salgada e doce).'
                  : 'Grande: até 4 sabores (pode misturar salgada e doce).'}
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="pizza-half-hint pizza-half-hint--broto">
          Broto: apenas um sabor (esta pizza inteira).
        </p>
      )}
    </div>
  )
}
