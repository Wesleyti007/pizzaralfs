import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import './App.css'
import logoRalfs from './assets/logo-ralfs.png'
import {
  DEFAULT_CATEGORIES,
  filterMenuByCatalog,
  getCategoryLabel,
  getItemCategoryLabel,
  getSubcategoryLabel,
  applyPriceMask,
  buildHalfAndHalfCartName,
  buildSizePricesFromItem,
  buildSizesFromForm,
  computeHalfAndHalfPrice,
  emptySizePrices,
  formatPriceForInput,
  formatPriceRangeLabel,
  halfAndHalfPairKey,
  parsePriceInput,
  groupMenuItemsForAdmin,
  isPizzaCategory,
  itemHasSizes,
  normalizeCategories,
  normalizeMenuItemCategories,
  normalizeMenuItemSizes,
  PIZZA_SIZE_TEMPLATES,
  resolveActiveCategory,
  resolveActiveSubcategory,
  slugify,
} from './catalog.js'

const STORAGE_KEY = 'pizza-ralfs-menu'
const CATEGORIES_STORAGE_KEY = 'pizza-ralfs-categories'
const TABLES_STORAGE_KEY = 'pizza-ralfs-tables'
const AUTH_STORAGE_KEY = 'pizza-ralfs-auth'
const ADMIN_LOGIN_PATH = '/acesso-admin-ralfs-2026'
const ORDER_STORAGE_PREFIX = 'pizza-ralfs-last-order'
const HOME_SPLASH_MS = 2000
const HOME_SPLASH_FADE_MS = 400
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

const CatalogSplashContext = createContext('hidden')

function isCatalogRoute(pathname) {
  return pathname === '/' || pathname.startsWith('/categoria/')
}

const defaultMenu = [
  {
    id: 1,
    category: 'pizzas',
    name: 'Margherita',
    description: 'Molho de tomate, mussarela, manjericao e azeite.',
    price: 49.9,
    image:
      'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    category: 'pizzas',
    name: 'Calabresa',
    description: 'Molho de tomate, mussarela, calabresa e cebola.',
    price: 54.9,
    image:
      'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    category: 'pizzas',
    name: 'Portuguesa',
    description: 'Presunto, ovos, cebola, azeitona e mussarela.',
    price: 59.9,
    image:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 4,
    category: 'esfirras',
    name: 'Esfirra de Carne',
    description: 'Esfirra aberta recheada com carne temperada.',
    price: 8.9,
    image:
      'https://images.unsplash.com/photo-1548365328-9f547fb0953a?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 5,
    category: 'coxinhas',
    name: 'Coxinha de Frango',
    description: 'Massa crocante com recheio cremoso de frango.',
    price: 9.9,
    image:
      'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 6,
    category: 'bebidas',
    name: 'Refrigerante Lata',
    description: 'Lata 350ml (sabores variados).',
    price: 6.5,
    image:
      'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
  },
]

const defaultTables = Array.from({ length: 30 }, (_, i) => i + 1)

function normalizeItemId(id) {
  if (id === null || id === undefined || id === '') return id
  return String(id)
}

function sameItemId(left, right) {
  return normalizeItemId(left) === normalizeItemId(right)
}

function sameCartLine(left, right) {
  const sizeMatch = (left.sizeId || '') === (right.sizeId || '')
  const leftHalf = left.secondFlavorId || ''
  const rightHalf = right.secondFlavorId || ''

  if (leftHalf || rightHalf) {
    if (!leftHalf || !rightHalf) return false
    return (
      sizeMatch &&
      halfAndHalfPairKey(left.id, left.secondFlavorId) ===
        halfAndHalfPairKey(right.id, right.secondFlavorId)
    )
  }

  return sameItemId(left.id, right.id) && sizeMatch
}

function cartLineKey(item) {
  if (item.secondFlavorId) {
    return `${halfAndHalfPairKey(item.id, item.secondFlavorId)}:${item.sizeId || ''}`
  }
  return `${normalizeItemId(item.id)}:${item.sizeId || ''}`
}

function formatBRL(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'R$ 0,00'
  return `R$ ${numeric.toFixed(2).replace('.', ',')}`
}

function normalizeMenuItems(items, categories) {
  return items.map((item) => {
    const normalized = normalizeMenuItemCategories(item, categories)
    return {
      ...normalizeMenuItemSizes(normalized),
      id: normalizeItemId(item.id),
      image: typeof item.image === 'string' ? item.image : '',
    }
  })
}

function loadCategories() {
  const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY)
  if (!saved) return DEFAULT_CATEGORIES

  try {
    return normalizeCategories(JSON.parse(saved))
  } catch {
    return DEFAULT_CATEGORIES
  }
}

function loadMenu(categories) {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return normalizeMenuItems(defaultMenu, categories)

  try {
    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return normalizeMenuItems(parsed, categories)
    }
  } catch {
    return normalizeMenuItems(defaultMenu, categories)
  }

  return normalizeMenuItems(defaultMenu, categories)
}

function loadTables() {
  const saved = localStorage.getItem(TABLES_STORAGE_KEY)
  if (!saved) return defaultTables

  try {
    const parsed = JSON.parse(saved)
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
      if (normalized.length > 0) {
        return Array.from(new Set(normalized)).sort((a, b) => a - b)
      }
    }
  } catch {
    return defaultTables
  }

  return defaultTables
}

function App() {
  const [categories, setCategories] = useState(loadCategories)
  const [menuItems, setMenuItems] = useState(() => loadMenu(loadCategories()))
  const [tables, setTables] = useState(loadTables)
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(AUTH_STORAGE_KEY) === 'true',
  )
  const [menuSyncMessage, setMenuSyncMessage] = useState('')

  const saveTables = (items) => {
    const normalized = Array.from(new Set(items)).sort((a, b) => a - b)
    setTables(normalized)
    localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(normalized))
  }

  useEffect(() => {
    const loadDataFromApi = async () => {
      let nextCategories = categories

      try {
        const categoriesResponse = await fetch(`${API_BASE_URL}/categories`)
        if (categoriesResponse.ok) {
          const apiCategories = await categoriesResponse.json()
          nextCategories = normalizeCategories(apiCategories)
          setCategories(nextCategories)
          localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(nextCategories))
        }
      } catch {
        // mantem categorias locais
      }

      try {
        const response = await fetch(`${API_BASE_URL}/menu-items`)
        if (!response.ok) {
          throw new Error('Falha ao carregar produtos')
        }
        const items = await response.json()
        if (Array.isArray(items) && items.length > 0) {
          const normalizedItems = normalizeMenuItems(items, nextCategories)
          setMenuItems(normalizedItems)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedItems))
          setMenuSyncMessage('')
        } else {
          setMenuSyncMessage('API sem produtos cadastrados. Usando cardapio local por enquanto.')
        }
      } catch {
        setMenuSyncMessage('Sem conexao com API de produtos. Usando cardapio local.')
      }
    }

    loadDataFromApi()
  }, [])

  const createMenuItem = async (itemData) => {
    const response = await fetch(`${API_BASE_URL}/menu-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(itemData),
    })

    if (!response.ok) {
      throw new Error('Falha ao criar produto')
    }

    const createdItem = await response.json()
    const updated = normalizeMenuItems([createdItem, ...menuItems], categories)
    setMenuItems(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setMenuSyncMessage('')
  }

  const updateMenuItem = async (itemId, itemData) => {
    const response = await fetch(`${API_BASE_URL}/menu-items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(itemData),
    })

    if (!response.ok) {
      let detail = 'Falha ao atualizar produto'
      try {
        const errorBody = await response.json()
        if (errorBody?.detail) detail = `${errorBody.message}: ${errorBody.detail}`
        else if (errorBody?.message) detail = errorBody.message
      } catch {
        // mantem mensagem padrao
      }
      throw new Error(detail)
    }

    const updatedItem = await response.json()
    const updated = normalizeMenuItems(
      menuItems.map((item) => (sameItemId(item.id, itemId) ? updatedItem : item)),
      categories,
    )
    setMenuItems(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setMenuSyncMessage('')
  }

  const saveCategories = async (nextCategories) => {
    const normalized = normalizeCategories(nextCategories)

    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: normalized }),
      })
      if (!response.ok) {
        throw new Error('Falha ao salvar categorias')
      }
      const saved = normalizeCategories(await response.json())
      setCategories(saved)
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(saved))
      const updatedMenu = normalizeMenuItems(menuItems, saved)
      setMenuItems(updatedMenu)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMenu))
      return { ok: true }
    } catch {
      setCategories(normalized)
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(normalized))
      return { ok: false }
    }
  }

  const deleteMenuItem = async (itemId) => {
    const response = await fetch(`${API_BASE_URL}/menu-items/${itemId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Falha ao remover produto')
    }

    const updated = menuItems.filter((item) => !sameItemId(item.id, itemId))
    setMenuItems(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setMenuSyncMessage('')
  }

  const handleLogin = (username, password) => {
    if (username === 'admin' && password === 'admin') {
      setIsAuthenticated(true)
      localStorage.setItem(AUTH_STORAGE_KEY, 'true')
      return true
    }
    return false
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  return (
    <BrowserRouter>
      <CatalogSplashProvider>
      <div className="app">
        <header className="brand-header">
          <Link to="/" className="brand-header-logo">
            <img src={logoRalfs} alt="Pizzas Ralf's" />
          </Link>
          <div className="brand-header-text">
            <p className="brand-header-kicker">Sabor tradicional</p>
            <h1 className="brand-header-title">Pizzas Ralf&apos;s</h1>
          </div>
          <nav className="brand-header-nav">
            <Link to="/">Cardapio</Link>
            {isAuthenticated ? (
              <>
                <Link to="/admin">Admin</Link>
                <Link to="/qrcodes">QR Mesas</Link>
                <button type="button" className="nav-btn" onClick={handleLogout}>
                  Sair
                </button>
              </>
            ) : null}
          </nav>
        </header>

        <main>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage menuItems={menuItems} tables={tables} categories={categories} />
              }
            />
            <Route
              path="/categoria/:categoryId"
              element={
                <HomePage menuItems={menuItems} tables={tables} categories={categories} />
              }
            />
            <Route
              path="/categoria/:categoryId/:subcategoryId"
              element={
                <HomePage menuItems={menuItems} tables={tables} categories={categories} />
              }
            />
            <Route
              path={ADMIN_LOGIN_PATH}
              element={<LoginPage isAuthenticated={isAuthenticated} onLogin={handleLogin} />}
            />
            <Route
              element={<ProtectedRoute isAuthenticated={isAuthenticated} />}
            >
            <Route
              path="/admin"
              element={
                <AdminPage
                  menuItems={menuItems}
                  categories={categories}
                  setCategories={setCategories}
                  saveCategories={saveCategories}
                  createMenuItem={createMenuItem}
                  updateMenuItem={updateMenuItem}
                  deleteMenuItem={deleteMenuItem}
                  menuSyncMessage={menuSyncMessage}
                  tables={tables}
                  saveTables={saveTables}
                />
              }
            />
            <Route path="/qrcodes" element={<QrCodesPage tables={tables} />} />
            </Route>
          </Routes>
        </main>
      </div>
      </CatalogSplashProvider>
    </BrowserRouter>
  )
}

function CatalogSplashProvider({ children }) {
  const location = useLocation()
  const isCatalog = isCatalogRoute(location.pathname)
  const [splashPhase, setSplashPhase] = useState('hidden')
  const splashRunRef = useRef(0)

  useEffect(() => {
    if (!isCatalog) {
      setSplashPhase('hidden')
      document.body.classList.remove('home-splash-active')
      return undefined
    }

    const runId = ++splashRunRef.current
    setSplashPhase('visible')
    document.body.classList.add('home-splash-active')

    const finishSplash = () => {
      if (runId !== splashRunRef.current) return
      setSplashPhase('hidden')
      document.body.classList.remove('home-splash-active')
    }

    const hideTimer = window.setTimeout(() => {
      if (runId !== splashRunRef.current) return
      setSplashPhase('hiding')
    }, HOME_SPLASH_MS)
    const doneTimer = window.setTimeout(finishSplash, HOME_SPLASH_MS + HOME_SPLASH_FADE_MS)
    const safetyTimer = window.setTimeout(
      finishSplash,
      HOME_SPLASH_MS + HOME_SPLASH_FADE_MS + 2000,
    )

    return () => {
      splashRunRef.current += 1
      window.clearTimeout(hideTimer)
      window.clearTimeout(doneTimer)
      window.clearTimeout(safetyTimer)
      document.body.classList.remove('home-splash-active')
    }
  }, [isCatalog])

  return (
    <CatalogSplashContext.Provider value={splashPhase}>
      <HomeSplash phase={isCatalog ? splashPhase : 'hidden'} />
      {children}
    </CatalogSplashContext.Provider>
  )
}

function ProtectedRoute({ isAuthenticated }) {
  if (!isAuthenticated) {
    return <Navigate to={ADMIN_LOGIN_PATH} replace />
  }
  return <Outlet />
}

function LoginPage({ isAuthenticated, onLogin }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const ok = onLogin(form.username.trim(), form.password.trim())
    if (ok) {
      navigate('/admin')
      return
    }
    setError('Usuario ou senha invalidos.')
  }

  return (
    <section className="login-page">
      <h2>Login Admin</h2>
      <p>Acesso restrito para Admin e QR Mesas.</p>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Usuario"
        />
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Senha"
        />
        {error && <p className="login-error">{error}</p>}
        <button type="submit">Entrar</button>
      </form>
    </section>
  )
}

function OrderPanel({
  className,
  cart,
  mesaValida,
  mesa,
  total,
  observation,
  setObservation,
  isSubmittingOrder,
  orderMessage,
  lastOrder,
  changeQuantity,
  finalizeOrder,
  downloadOrder,
  onClose,
  formatBRL,
}) {
  return (
    <aside className={className}>
      <div className="order-panel-head">
        <h2 className="order-panel-title">Seu pedido</h2>
        {onClose && (
          <button
            type="button"
            className="order-panel-close"
            onClick={onClose}
            aria-label="Fechar pedido"
            title="Fechar"
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      <div className="order-panel-scroll">
        {cart.length === 0 && <p className="order-empty-msg">Sua cesta esta vazia.</p>}

        {cart.map((item) => (
          <div key={cartLineKey(item)} className="basket-item">
            <div>
              <strong>{item.name}</strong>
              {item.secondFlavorId && (
                <span className="basket-item-half-note">Meia a meia · valor do sabor mais caro</span>
              )}
              {item.sizeLabel && !item.secondFlavorId && (
                <span className="basket-item-size">{item.sizeLabel}</span>
              )}
              <span>{formatBRL(item.price * item.qty)}</span>
            </div>
            <div className="qty">
              <button type="button" onClick={() => changeQuantity(cartLineKey(item), -1)}>
                -
              </button>
              <span>{item.qty}</span>
              <button type="button" onClick={() => changeQuantity(cartLineKey(item), 1)}>
                +
              </button>
            </div>
          </div>
        ))}

        <footer className="order-panel-footer">
          {mesaValida && <p className="mesa-total">Pedido da mesa #{mesa}</p>}
          <h3 className="order-total">Total: R$ {total.toFixed(2)}</h3>
          <label
            htmlFor={onClose ? 'order-observation-mobile' : 'order-observation'}
            className="observation-label"
          >
            Observacao do pedido
          </label>
          <textarea
            id={onClose ? 'order-observation-mobile' : 'order-observation'}
            className="observation-input"
            value={observation}
            onChange={(event) => setObservation(event.target.value)}
            placeholder="Ex: sem cebola, massa bem assada, trocar refrigerante..."
          />
          <button
            type="button"
            className="btn-primary"
            onClick={finalizeOrder}
            disabled={cart.length === 0 || isSubmittingOrder}
          >
            {isSubmittingOrder ? 'Enviando...' : 'Finalizar pedido'}
          </button>
          {orderMessage && <p className="order-message">{orderMessage}</p>}
          <button
            type="button"
            className="download-btn"
            onClick={() => lastOrder && downloadOrder(lastOrder)}
            disabled={!lastOrder}
          >
            Baixar ultimo pedido
          </button>
        </footer>
      </div>
    </aside>
  )
}

function HomeSplash({ phase }) {
  if (phase === 'hidden') return null

  return createPortal(
    <div
      className={`home-splash${phase === 'hiding' ? ' home-splash--hide' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={phase === 'visible'}
      aria-label="Carregando cardapio"
    >
      <div className="home-splash-inner">
        <img src={logoRalfs} alt="Pizzas Ralf's" className="home-splash-logo" />
        <p className="home-splash-kicker">Sabor tradicional</p>
        <div className="home-splash-loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function MenuItemCard({ menuItem, onAddToCart, pizzaItems = [] }) {
  const hasSizes = itemHasSizes(menuItem)
  const canHalfAndHalf = hasSizes && pizzaItems.length > 1
  const [selectedSizeId, setSelectedSizeId] = useState(
    () => menuItem.sizes?.[0]?.id || 'broto',
  )
  const [pizzaMode, setPizzaMode] = useState('inteira')
  const [secondFlavorId, setSecondFlavorId] = useState('')

  const selectedSize =
    menuItem.sizes?.find((size) => size.id === selectedSizeId) || menuItem.sizes?.[0]
  const unitPrice = hasSizes ? selectedSize?.price || menuItem.price : menuItem.price

  const otherPizzaOptions = useMemo(
    () => pizzaItems.filter((item) => !sameItemId(item.id, menuItem.id)),
    [pizzaItems, menuItem.id],
  )

  const secondFlavor = useMemo(
    () => otherPizzaOptions.find((item) => sameItemId(item.id, secondFlavorId)),
    [otherPizzaOptions, secondFlavorId],
  )

  const displayPrice = useMemo(() => {
    if (pizzaMode === 'meia' && secondFlavor) {
      return computeHalfAndHalfPrice(menuItem, secondFlavor, selectedSizeId)
    }
    return unitPrice
  }, [pizzaMode, secondFlavor, menuItem, selectedSizeId, unitPrice])

  const handleAdd = () => {
    const sizeLabel = selectedSize
      ? `${selectedSize.label} (${selectedSize.pieces} pedacos)`
      : ''

    if (pizzaMode === 'meia') {
      if (!secondFlavor) return

      onAddToCart({
        ...menuItem,
        price: displayPrice,
        sizeId: selectedSize?.id || '',
        sizeLabel,
        secondFlavorId: normalizeItemId(secondFlavor.id),
        name: buildHalfAndHalfCartName(menuItem, secondFlavor, sizeLabel),
      })
      return
    }

    onAddToCart({
      ...menuItem,
      price: unitPrice,
      sizeId: selectedSize?.id || '',
      sizeLabel,
      secondFlavorId: '',
      name: sizeLabel ? `${menuItem.name} — ${selectedSize.label}` : menuItem.name,
    })
  }

  const addDisabled = pizzaMode === 'meia' && !secondFlavor

  return (
    <article className="card">
      <div className="card-media">
        {menuItem.image ? (
          <img
            src={menuItem.image}
            alt={menuItem.name}
            className="card-image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="card-image placeholder">Sem foto</div>
        )}
      </div>
      <h3>{menuItem.name}</h3>
      <p className="card-description">({menuItem.description})</p>

      {hasSizes ? (
        <>
          {canHalfAndHalf && (
            <div className="pizza-mode">
              <span className="pizza-sizes-label">Tipo</span>
              <div className="pizza-mode-options" role="group" aria-label="Tipo da pizza">
                <button
                  type="button"
                  className={`pizza-mode-btn${pizzaMode === 'inteira' ? ' is-active' : ''}`}
                  onClick={() => setPizzaMode('inteira')}
                >
                  Inteira
                </button>
                <button
                  type="button"
                  className={`pizza-mode-btn${pizzaMode === 'meia' ? ' is-active' : ''}`}
                  onClick={() => setPizzaMode('meia')}
                >
                  Meia a meia
                </button>
              </div>
              {pizzaMode === 'meia' && (
                <div className="pizza-half-flavor">
                  <label className="pizza-half-flavor-label" htmlFor={`half-${menuItem.id}`}>
                    Segundo sabor
                  </label>
                  <select
                    id={`half-${menuItem.id}`}
                    className="pizza-half-flavor-select"
                    value={secondFlavorId}
                    onChange={(event) => setSecondFlavorId(event.target.value)}
                  >
                    <option value="">Escolha o outro sabor</option>
                    {otherPizzaOptions.map((item) => (
                      <option key={item.id} value={normalizeItemId(item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <p className="pizza-half-hint">
                    Cobrado o valor do sabor mais caro neste tamanho.
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="pizza-sizes">
            <span className="pizza-sizes-label">Tamanho</span>
            <div className="pizza-sizes-options" role="group" aria-label="Tamanho da pizza">
              {menuItem.sizes.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  className={`pizza-size-btn${selectedSizeId === size.id ? ' is-active' : ''}`}
                  onClick={() => setSelectedSizeId(size.id)}
                >
                  <span className="pizza-size-btn-label">{size.label}</span>
                  <span className="pizza-size-btn-meta">{size.pieces} pedacos</span>
                  <span className="pizza-size-btn-price">R$ {size.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <strong className="card-price">{formatPriceRangeLabel(menuItem)}</strong>
      )}

      {hasSizes && (
        <strong className="card-price card-price--selected">
          R$ {displayPrice.toFixed(2)}
          {pizzaMode === 'meia' && secondFlavor && (
            <span className="card-price-note"> (sabor mais caro)</span>
          )}
        </strong>
      )}

      <button type="button" className="btn-add" onClick={handleAdd} disabled={addDisabled}>
        Adicionar
      </button>
    </article>
  )
}

function HomePage({ menuItems, tables, categories }) {
  const location = useLocation()
  const { categoryId, subcategoryId } = useParams()
  const splashPhase = useContext(CatalogSplashContext)
  const [cart, setCart] = useState([])
  const [observation, setObservation] = useState('')
  const [lastOrder, setLastOrder] = useState(null)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [orderMessage, setOrderMessage] = useState('')
  const [orderOpen, setOrderOpen] = useState(false)
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  )
  const mesaRaw = searchParams.get('mesa')
  const mesa = mesaRaw ? Number(mesaRaw) : null
  const mesaValida = mesa && Number.isInteger(mesa) && tables.includes(mesa)
  const orderStorageKey = mesaValida
    ? `${ORDER_STORAGE_PREFIX}-mesa-${mesa}`
    : `${ORDER_STORAGE_PREFIX}-cliente`
  const activeCategory = resolveActiveCategory(categories, categoryId || categories[0]?.id)
  const activeSubcategory = resolveActiveSubcategory(
    categories,
    activeCategory,
    subcategoryId,
  )
  const activeCategoryData = categories.find((category) => category.id === activeCategory)
  const filteredMenu = filterMenuByCatalog(
    menuItems,
    categories,
    activeCategory,
    activeSubcategory,
  )
  const pizzaMenuItems = useMemo(
    () => menuItems.filter((item) => isPizzaCategory(item.category)),
    [menuItems],
  )

  useEffect(() => {
    const saved = localStorage.getItem(orderStorageKey)
    if (!saved) {
      setLastOrder(null)
      return
    }

    try {
      setLastOrder(JSON.parse(saved))
    } catch {
      setLastOrder(null)
    }
  }, [orderStorageKey])

  const addToCart = (cartItem) => {
    setCart((current) => {
      const existing = current.find((item) => sameCartLine(item, cartItem))
      if (existing) {
        return current.map((item) =>
          sameCartLine(item, cartItem) ? { ...item, qty: item.qty + 1 } : item,
        )
      }

      return [...current, { ...cartItem, qty: 1 }]
    })
  }

  const changeQuantity = (lineKey, delta) => {
    setCart((current) =>
      current
        .map((item) =>
          cartLineKey(item) === lineKey
            ? { ...item, qty: Math.max(0, item.qty + delta) }
            : item,
        )
        .filter((item) => item.qty > 0),
    )
  }

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart],
  )
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart],
  )

  useEffect(() => {
    setOrderOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!orderOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [orderOpen])

  const formatOrderText = (order) => {
    const lines = [
      'Comprovante do Pedido - Pizza Ralfs',
      `Pedido: #${order.id}`,
      `Data: ${new Date(order.createdAt).toLocaleString('pt-BR')}`,
      order.mesa ? `Mesa: ${order.mesa}` : 'Mesa: nao identificada',
      '',
      'Itens:',
      ...order.items.map(
        (item) =>
          `- ${item.qty}x ${item.name} (${item.categoryLabel}) - R$ ${(
            item.price * item.qty
          ).toFixed(2)}`,
      ),
      '',
      `Total: R$ ${order.total.toFixed(2)}`,
      `Observacao: ${order.observation || 'Sem observacoes'}`,
    ]

    return lines.join('\n')
  }

  const downloadOrder = (order) => {
    const text = formatOrderText(order)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pedido-${order.id}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const finalizeOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return

    setIsSubmittingOrder(true)
    setOrderMessage('')

    const orderPayload = {
      mesa: mesaValida ? mesa : null,
      observation: observation.trim(),
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        subcategory: item.subcategory || '',
        categoryLabel: getItemCategoryLabel(categories, item),
        sizeId: item.sizeId || '',
        sizeLabel: item.sizeLabel || '',
        secondFlavorId: item.secondFlavorId || '',
        qty: item.qty,
        price: item.price,
      })),
      totalAmount: total,
    }
    const fallbackOrder = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      mesa: orderPayload.mesa,
      observation: orderPayload.observation,
      items: orderPayload.items,
      total,
    }

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      })

      if (!response.ok) {
        throw new Error('Falha ao enviar pedido')
      }

      const createdOrder = await response.json()
      const orderToSave = {
        id: createdOrder.id,
        createdAt: createdOrder.createdAt || new Date().toISOString(),
        mesa: createdOrder.tableNumber,
        observation: createdOrder.observation || '',
        items: orderPayload.items,
        total: Number(createdOrder.totalAmount || total),
      }

      setLastOrder(orderToSave)
      localStorage.setItem(orderStorageKey, JSON.stringify(orderToSave))
      setCart([])
      setObservation('')
      setOrderOpen(false)
      setOrderMessage('Pedido enviado com sucesso!')
    } catch {
      setLastOrder(fallbackOrder)
      localStorage.setItem(orderStorageKey, JSON.stringify(fallbackOrder))
      setCart([])
      setObservation('')
      setOrderOpen(false)
      setOrderMessage('Pedido salvo localmente (API indisponivel no momento).')
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  const activeCategoryLabel = getCategoryLabel(categories, activeCategory)
  const activeSubcategoryLabel =
    activeSubcategory && activeSubcategory !== 'todas'
      ? getSubcategoryLabel(categories, activeCategory, activeSubcategory)
      : null
  const sectionTitle = activeSubcategoryLabel
    ? `${activeCategoryLabel} — ${activeSubcategoryLabel}`
    : activeCategoryLabel

  const buildCategoryPath = (nextCategoryId, nextSubcategoryId = null) => {
    const category = categories.find((item) => item.id === nextCategoryId)
    const hasSubs = (category?.subcategories || []).length > 0
    const mesaQuery = mesaValida ? `?mesa=${mesa}` : ''
    if (hasSubs) {
      const sub = nextSubcategoryId || 'todas'
      return `/categoria/${nextCategoryId}/${sub}${mesaQuery}`
    }
    return `/categoria/${nextCategoryId}${mesaQuery}`
  }

  const orderPanelProps = {
    cart,
    mesaValida,
    mesa,
    total,
    observation,
    setObservation,
    isSubmittingOrder,
    orderMessage,
    lastOrder,
    changeQuantity,
    finalizeOrder,
    downloadOrder,
    formatBRL,
  }

  const orderPanelSheet = (
    <OrderPanel
      {...orderPanelProps}
      className={`basket order-panel order-panel--sheet${orderOpen ? ' order-panel-open' : ''}`}
      onClose={() => setOrderOpen(false)}
    />
  )

  const orderPanelDesktop = (
    <OrderPanel
      {...orderPanelProps}
      className="basket order-panel order-panel--desktop"
      onClose={null}
    />
  )

  const mobileOrderUi = createPortal(
    <div className="order-mobile-layer">
      {orderOpen && (
        <button
          type="button"
          className="order-drawer-backdrop"
          aria-label="Fechar pedido"
          onClick={() => setOrderOpen(false)}
        />
      )}
      <div className={`order-mobile-bar${orderOpen ? ' order-mobile-bar--hidden' : ''}`}>
        <button
          type="button"
          className="order-mobile-bar-btn"
          onClick={() => setOrderOpen(true)}
          aria-expanded={orderOpen}
        >
          <span className="order-mobile-bar-title">Seu pedido</span>
          <span className="order-mobile-bar-meta">
            {cartCount} {cartCount === 1 ? 'item' : 'itens'} · R$ {total.toFixed(2)}
          </span>
        </button>
      </div>
      {orderPanelSheet}
    </div>,
    document.body,
  )

  return (
    <>
    {mobileOrderUi}
    <div
      className={`home-page${splashPhase === 'visible' ? ' home-page--splash-pending' : ''}`}
      aria-hidden={splashPhase === 'visible'}
    >
      <p className="home-intro">Escolha seus itens e monte seu pedido</p>
      <section className="layout home-layout">
      <div className="menu-grid">
        <div className="menu-watermark" aria-hidden="true">
          <img src={logoRalfs} alt="" />
        </div>
        {lastOrder && (
          <div className="last-order-banner">
            <strong>Ultimo pedido salvo: #{lastOrder.id}</strong>
            <span>
              Total R$ {lastOrder.total.toFixed(2)} em{' '}
              {new Date(lastOrder.createdAt).toLocaleString('pt-BR')}
            </span>
            <button type="button" onClick={() => downloadOrder(lastOrder)}>
              Baixar comprovante
            </button>
          </div>
        )}
        <div className="table-banner">
          {mesaValida ? (
            <>
              <strong>Mesa #{mesa}</strong>
              <span className="table-banner-msg">Pedido identificado automaticamente.</span>
            </>
          ) : (
            <>
              <strong>Mesa nao identificada</strong>
              <span className="table-banner-msg">
                Acesse por um QR da mesa para identificar seu pedido.
              </span>
            </>
          )}
        </div>
        <div className="category-section-head">
          <h3>{sectionTitle}</h3>
        </div>
        <div className="category-tabs">
          {categories.map((category) => {
            const isActive = category.id === activeCategory
            return (
              <Link
                key={category.id}
                to={buildCategoryPath(category.id, 'todas')}
                className={isActive ? 'tab active' : 'tab'}
              >
                {category.label}
              </Link>
            )
          })}
        </div>
        {(activeCategoryData?.subcategories || []).length > 0 && (
          <div className="subcategory-tabs">
            <Link
              to={buildCategoryPath(activeCategory, 'todas')}
              className={
                !activeSubcategory || activeSubcategory === 'todas' ? 'tab sub active' : 'tab sub'
              }
            >
              Todas
            </Link>
            {activeCategoryData.subcategories.map((sub) => (
              <Link
                key={sub.id}
                to={buildCategoryPath(activeCategory, sub.id)}
                className={activeSubcategory === sub.id ? 'tab sub active' : 'tab sub'}
              >
                {sub.label}
              </Link>
            ))}
          </div>
        )}
        <div className="menu-items-grid">
          {filteredMenu.map((menuItem) => (
            <MenuItemCard
              key={menuItem.id}
              menuItem={menuItem}
              onAddToCart={addToCart}
              pizzaItems={isPizzaCategory(menuItem.category) ? pizzaMenuItems : undefined}
            />
          ))}
          {filteredMenu.length === 0 && (
            <p className="empty-category">Nenhum item cadastrado nesta categoria.</p>
          )}
        </div>
      </div>

      {orderPanelDesktop}
    </section>
    </div>
    </>
  )
}

function QrCodesPage({ tables }) {
  const baseUrl = window.location.origin

  return (
    <section className="qr-page">
      <h2>QR Codes das Mesas</h2>
      <p>Imprima e cole um QR em cada mesa ativa.</p>

      <div className="qr-grid">
        {tables.map((mesa) => {
          const url = `${baseUrl}/?mesa=${mesa}`
          return (
            <article key={mesa} className="qr-card">
              <h3>Mesa {mesa}</h3>
              <QRCodeSVG value={url} size={140} />
              <a href={url} target="_blank" rel="noreferrer">
                Abrir link da mesa
              </a>
            </article>
          )
        })}
      </div>
    </section>
  )
}

const emptyItemForm = {
  category: 'pizzas',
  subcategory: '',
  name: '',
  description: '',
  price: '',
  sizePrices: emptySizePrices(),
  image: '',
}

function buildItemFormFromMenuItem(item) {
  const hasPizzaSizes = itemHasSizes(item)
  return {
    category: item.category,
    subcategory: item.subcategory || '',
    name: item.name,
    description: item.description,
    price: hasPizzaSizes ? '' : formatPriceForInput(item.price),
    sizePrices: buildSizePricesFromItem(item),
    image: item.image || '',
  }
}

function AdminItemFormFields({
  form,
  categories,
  subcategoryOptions,
  onChange,
  onPriceChange,
  onSizePriceChange,
  onImageUpload,
}) {
  const showPizzaSizes = isPizzaCategory(form.category)

  return (
    <>
      <select name="category" value={form.category} onChange={onChange}>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </select>
      {subcategoryOptions.length > 0 && (
        <select name="subcategory" value={form.subcategory} onChange={onChange}>
          <option value="">Sem subcategoria / Geral</option>
          {subcategoryOptions.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.label}
            </option>
          ))}
        </select>
      )}
      <input name="name" value={form.name} onChange={onChange} placeholder="Nome do item" />
      <input
        name="description"
        value={form.description}
        onChange={onChange}
        placeholder="Descricao"
        className="field-full"
      />
      <input
        name="image"
        value={form.image}
        onChange={onChange}
        placeholder="URL da foto"
        className="field-full"
      />
      <label className="file-input-label field-full">
        Foto do produto
        <input type="file" accept="image/*" onChange={onImageUpload} />
      </label>
      {showPizzaSizes ? (
        <div className="pizza-sizes-admin field-full">
          <span className="field-label">Precos por tamanho (pizzas)</span>
          <div className="pizza-sizes-admin-grid">
            {PIZZA_SIZE_TEMPLATES.map((template) => (
              <label key={template.id} className="pizza-size-admin-field">
                <span className="pizza-size-admin-label">
                  {template.label} ({template.pieces} pedacos)
                </span>
                <div className="price-input-wrap">
                  <span className="price-prefix" aria-hidden="true">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.sizePrices?.[template.id] || ''}
                    onChange={(event) => onSizePriceChange(template.id, event.target.value)}
                    placeholder="0,00"
                    aria-label={`Preco ${template.label}`}
                  />
                </div>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <label className="price-field">
          <span className="field-label">Valor do item</span>
          <div className="price-input-wrap">
            <span className="price-prefix" aria-hidden="true">
              R$
            </span>
            <input
              name="price"
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={onPriceChange}
              placeholder="0,00"
              aria-label="Valor em reais"
            />
          </div>
          <small className="field-hint">Digite os numeros; o valor formata sozinho (ex: 4990 vira 49,90).</small>
        </label>
      )}
    </>
  )
}

function AdminEditItemModal({
  editingId,
  form,
  categories,
  subcategoryOptions,
  isSaving,
  onClose,
  onSubmit,
  onChange,
  onPriceChange,
  onSizePriceChange,
  onImageUpload,
}) {
  useEffect(() => {
    if (!editingId) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isSaving) onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [editingId, isSaving, onClose])

  if (!editingId) return null

  return createPortal(
    <div className="admin-edit-modal-backdrop" onClick={isSaving ? undefined : onClose}>
      <div
        className="admin-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-edit-item-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-edit-modal-header">
          <h4 id="admin-edit-item-title">Editar item</h4>
          <button
            type="button"
            className="admin-edit-modal-close"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Fechar edicao"
          >
            ×
          </button>
        </header>
        <form onSubmit={onSubmit} className="admin-form admin-form--modal">
          <AdminItemFormFields
            form={form}
            categories={categories}
            subcategoryOptions={subcategoryOptions}
            onChange={onChange}
            onPriceChange={onPriceChange}
            onSizePriceChange={onSizePriceChange}
            onImageUpload={onImageUpload}
          />
          {form.image && (
            <div className="image-preview image-preview--modal field-full">
              <p>Pre-visualizacao da foto</p>
              <img src={form.image} alt="Preview do item" />
            </div>
          )}
          <div className="admin-form-actions">
            <button type="submit" className="admin-btn admin-btn-primary" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
            <button
              type="button"
              className="cancel-btn admin-btn admin-btn-ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

function AdminFeedbackModal({ modal, onClose }) {
  useEffect(() => {
    if (!modal) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [modal, onClose])

  useEffect(() => {
    if (!modal || modal.variant === 'confirm') return undefined
    const timer = window.setTimeout(onClose, 3800)
    return () => window.clearTimeout(timer)
  }, [modal, onClose])

  if (!modal) return null

  const iconByVariant = {
    success: '✓',
    error: '✕',
    warning: '!',
    confirm: '?',
  }

  return createPortal(
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div
        className={`admin-modal admin-modal--${modal.variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-icon" aria-hidden="true">
          {iconByVariant[modal.variant] || '•'}
        </div>
        <h4 id="admin-modal-title" className="admin-modal-title">
          {modal.title}
        </h4>
        <p className="admin-modal-text">{modal.description}</p>
        <div className="admin-modal-actions">
          {modal.variant === 'confirm' ? (
            <>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
                {modal.cancelLabel || 'Cancelar'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => modal.onConfirm?.()}
              >
                {modal.confirmLabel || 'Confirmar'}
              </button>
            </>
          ) : (
            <button type="button" className="admin-btn admin-btn-primary" onClick={onClose}>
              Entendi
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function CategoriesAdmin({ categories, setCategories, saveCategories }) {
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [newSubLabelByCategory, setNewSubLabelByCategory] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [modal, setModal] = useState(null)
  const [openCategoryId, setOpenCategoryId] = useState(null)

  const closeModal = () => setModal(null)
  const showModal = (config) => setModal(config)

  const toggleCategoryPanel = (categoryId) => {
    setOpenCategoryId((current) => (current === categoryId ? null : categoryId))
  }

  const updateCategoryLabel = (categoryId, label) => {
    setCategories(
      categories.map((category) =>
        category.id === categoryId ? { ...category, label } : category,
      ),
    )
  }

  const removeCategory = (categoryId) => {
    const next = categories.filter((category) => category.id !== categoryId)
    setCategories(next)
    if (openCategoryId === categoryId) {
      setOpenCategoryId(null)
    }
  }

  const confirmRemoveCategory = (category) => {
    showModal({
      variant: 'confirm',
      title: 'Excluir categoria?',
      description: `A categoria "${category.label}" sera removida. Lembre de salvar para aplicar no banco.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        removeCategory(category.id)
        showModal({
          variant: 'success',
          title: 'Categoria removida',
          description: 'Alteracao feita. Clique em "Salvar categorias" para gravar.',
        })
      },
    })
  }

  const addCategory = () => {
    const label = newCategoryLabel.trim()
    if (!label) {
      showModal({
        variant: 'error',
        title: 'Nome obrigatorio',
        description: 'Digite o nome da categoria no campo acima antes de adicionar.',
      })
      document.getElementById('new-category-input')?.focus()
      return
    }

    let id = slugify(label)
    if (categories.some((category) => category.id === id)) {
      id = `${id}-${Date.now()}`
    }

    setCategories([...categories, { id, label, subcategories: [] }])
    setNewCategoryLabel('')
    setOpenCategoryId(id)
    showModal({
      variant: 'success',
      title: 'Categoria criada',
      description: `"${label}" foi adicionada. Clique em "Salvar categorias" para gravar no banco.`,
    })

    window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-category-id="${id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const addSubcategory = (categoryId) => {
    const label = String(newSubLabelByCategory[categoryId] || '').trim()
    const category = categories.find((item) => item.id === categoryId)
    if (!label) {
      showModal({
        variant: 'error',
        title: 'Nome obrigatorio',
        description: 'Digite o nome da subcategoria antes de adicionar.',
      })
      return
    }

    setCategories(
      categories.map((item) => {
        if (item.id !== categoryId) return item

        let subId = slugify(label)
        if (item.subcategories.some((sub) => sub.id === subId)) {
          subId = `${subId}-${Date.now()}`
        }

        return {
          ...item,
          subcategories: [...item.subcategories, { id: subId, label }],
        }
      }),
    )
    setNewSubLabelByCategory((current) => ({ ...current, [categoryId]: '' }))
    showModal({
      variant: 'success',
      title: 'Subcategoria criada',
      description: `"${label}" adicionada em ${category?.label || 'categoria'}. Salve para gravar.`,
    })
  }

  const updateSubcategoryLabel = (categoryId, subId, label) => {
    setCategories(
      categories.map((category) => {
        if (category.id !== categoryId) return category
        return {
          ...category,
          subcategories: category.subcategories.map((sub) =>
            sub.id === subId ? { ...sub, label } : sub,
          ),
        }
      }),
    )
  }

  const removeSubcategory = (categoryId, subId) => {
    setCategories(
      categories.map((category) => {
        if (category.id !== categoryId) return category
        return {
          ...category,
          subcategories: category.subcategories.filter((sub) => sub.id !== subId),
        }
      }),
    )
  }

  const confirmRemoveSubcategory = (category, sub) => {
    showModal({
      variant: 'confirm',
      title: 'Excluir subcategoria?',
      description: `"${sub.label}" sera removida de ${category.label}. Salve para gravar no banco.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        removeSubcategory(category.id, sub.id)
        showModal({
          variant: 'success',
          title: 'Subcategoria removida',
          description: 'Alteracao feita. Clique em "Salvar categorias" para gravar.',
        })
      },
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    const result = await saveCategories(categories)
    setIsSaving(false)
    showModal(
      result.ok
        ? {
            variant: 'success',
            title: 'Categorias salvas',
            description: 'Todas as categorias e subcategorias foram gravadas no banco.',
          }
        : {
            variant: 'warning',
            title: 'Salvo apenas no navegador',
            description:
              'As alteracoes ficaram no dispositivo. Verifique se a API esta rodando e tente salvar de novo.',
          },
    )
  }

  return (
    <section className="categories-admin">
      <div className="categories-admin-intro">
        <h3>Categorias e subcategorias</h3>
        <p>Monte o cardapio: categoria principal (ex: Pizzas) e subcategorias (ex: Doces, Premium).</p>
      </div>

      <form
        className="category-add-form admin-inline-form"
        onSubmit={(event) => {
          event.preventDefault()
          addCategory()
        }}
      >
        <input
          id="new-category-input"
          value={newCategoryLabel}
          onChange={(event) => setNewCategoryLabel(event.target.value)}
          placeholder="Nome da categoria (ex: Pizzas)"
          aria-label="Nome da nova categoria"
        />
        <button type="submit" className="admin-btn admin-btn-gold">
          + Nova categoria
        </button>
      </form>
      <p className="category-add-hint">Primeiro digite o nome, depois clique em adicionar.</p>

      <div className="category-accordion">
        {categories.map((category) => {
          const isOpen = openCategoryId === category.id
          const subCount = category.subcategories.length

          return (
            <article
              key={category.id}
              data-category-id={category.id}
              className={`category-accordion-item${isOpen ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="category-accordion-trigger"
                onClick={() => toggleCategoryPanel(category.id)}
                aria-expanded={isOpen}
              >
                <span className="category-accordion-trigger-text">
                  <span className="category-accordion-label">{category.label}</span>
                  <span className="category-accordion-meta">
                    {subCount} {subCount === 1 ? 'subcategoria' : 'subcategorias'}
                  </span>
                </span>
                <span className="category-accordion-chevron" aria-hidden="true" />
              </button>

              <div className="category-accordion-panel">
                <div className="category-admin-head">
                  <label className="admin-field">
                    <span className="admin-field-label">Nome da categoria</span>
                    <input
                      value={category.label}
                      onChange={(event) =>
                        updateCategoryLabel(category.id, event.target.value)
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={() => confirmRemoveCategory(category)}
                  >
                    Excluir categoria
                  </button>
                </div>
                <p className="category-admin-id">
                  ID: <code>{category.id}</code>
                </p>

                <div className="subcategory-admin-block">
                  <h4 className="subcategory-admin-title">Subcategorias</h4>
                  {category.subcategories.length === 0 && (
                    <p className="subcategory-admin-empty">
                      Nenhuma subcategoria. Adicione abaixo se precisar (ex: Doces, Premium).
                    </p>
                  )}
                  <div className="subcategory-admin-list">
                    {category.subcategories.map((sub) => (
                      <div key={sub.id} className="subcategory-admin-row">
                        <input
                          value={sub.label}
                          onChange={(event) =>
                            updateSubcategoryLabel(category.id, sub.id, event.target.value)
                          }
                          aria-label={`Subcategoria ${sub.label}`}
                        />
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost"
                          onClick={() => confirmRemoveSubcategory(category, sub)}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="subcategory-add-form admin-inline-form">
                    <input
                      value={newSubLabelByCategory[category.id] || ''}
                      onChange={(event) =>
                        setNewSubLabelByCategory((current) => ({
                          ...current,
                          [category.id]: event.target.value,
                        }))
                      }
                      placeholder="Nova subcategoria (ex: Pizza Promocionais)"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addSubcategory(category.id)
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="admin-btn admin-btn-outline"
                      onClick={() => addSubcategory(category.id)}
                    >
                      + Subcategoria
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="categories-admin-footer">
        <button
          type="button"
          className="admin-btn admin-btn-primary save-categories-btn"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Salvando categorias...' : 'Salvar categorias'}
        </button>
      </div>

      <AdminFeedbackModal modal={modal} onClose={closeModal} />
    </section>
  )
}

const ADMIN_SECTIONS = [
  { id: 'novo', label: 'Novo item', hint: 'Cadastrar produto' },
  { id: 'itens', label: 'Itens', hint: 'Lista do cardapio' },
  { id: 'categorias', label: 'Categorias', hint: 'Grupos do menu' },
  { id: 'qrcodes', label: 'QR Codes', hint: 'Mesas e impressao' },
]

function AdminItemPricing({ item }) {
  if (itemHasSizes(item)) {
    return (
      <ul className="admin-item-sizes">
        {item.sizes.map((size) => (
          <li key={size.id} className="admin-item-size-row">
            <span className="admin-item-size-label">
              {size.label} <span className="admin-item-size-meta">({size.pieces} fatias)</span>
            </span>
            <span className="admin-item-size-price">{formatBRL(size.price)}</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <p className="admin-item-price">
      <span className="admin-item-price-label">Preco</span>
      <span className="admin-item-price-value">{formatBRL(item.price)}</span>
    </p>
  )
}

function AdminMenuItemRow({ item, onEdit, onRemove }) {
  return (
    <article className="admin-item">
      <div className="admin-item-body">
        <strong className="admin-item-name">{item.name}</strong>
        <dl className="admin-item-meta">
          <div className="admin-item-meta-row">
            <dt>Imagem</dt>
            <dd>
              {item.image ? (
                <a href={item.image} target="_blank" rel="noreferrer">
                  Ver foto
                </a>
              ) : (
                <span className="admin-item-muted">Sem foto</span>
              )}
            </dd>
          </div>
        </dl>
        <p className="admin-item-description">{item.description}</p>
        <AdminItemPricing item={item} />
      </div>
      <div className="admin-item-actions">
        <button type="button" className="edit-btn" onClick={() => onEdit(item)}>
          Editar
        </button>
        <button type="button" onClick={() => onRemove(item.id, item.name)}>
          Remover
        </button>
      </div>
    </article>
  )
}

function AdminItemsCatalog({ groupedMenu, openItemsCategoryId, onToggleCategory, onEdit, onRemove }) {
  return (
    <section className="admin-items-catalog admin-tab-panel-inner">
      <header className="admin-panel-header">
        <h3>Itens cadastrados</h3>
        <p>Lista por categoria. Abra cada bloco para ver precos, tamanhos e acoes.</p>
      </header>

      <div className="category-accordion admin-menu-accordion">
        {groupedMenu.knownGroups.map(({ category, totalCount, sections }) => {
          const isOpen = openItemsCategoryId === category.id
          const itemLabel = totalCount === 1 ? '1 item' : `${totalCount} itens`

          return (
            <article
              key={category.id}
              className={`category-accordion-item${isOpen ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="category-accordion-trigger"
                onClick={() => onToggleCategory(category.id)}
                aria-expanded={isOpen}
              >
                <span className="category-accordion-trigger-text">
                  <span className="category-accordion-label">{category.label}</span>
                  <span className="category-accordion-meta">{itemLabel}</span>
                </span>
                <span className="category-accordion-chevron" aria-hidden="true" />
              </button>

              <div className="category-accordion-panel">
                {totalCount === 0 ? (
                  <p className="admin-items-empty">Nenhum item nesta categoria.</p>
                ) : (
                  sections.map((section) => (
                    <div key={section.id || 'geral'} className="admin-items-section">
                      {section.label && (
                        <h4 className="admin-items-section-title">{section.label}</h4>
                      )}
                      <div className="admin-list admin-list--nested">
                        {section.items.map((item) => (
                          <AdminMenuItemRow
                            key={item.id}
                            item={item}
                            onEdit={onEdit}
                            onRemove={onRemove}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          )
        })}

        {groupedMenu.orphans.length > 0 && (
          <article
            className={`category-accordion-item admin-menu-accordion--orphans${
              openItemsCategoryId === '__orphans__' ? ' is-open' : ''
            }`}
          >
            <button
              type="button"
              className="category-accordion-trigger"
              onClick={() => onToggleCategory('__orphans__')}
              aria-expanded={openItemsCategoryId === '__orphans__'}
            >
              <span className="category-accordion-trigger-text">
                <span className="category-accordion-label">Sem categoria cadastrada</span>
                <span className="category-accordion-meta">
                  {groupedMenu.orphans.length}{' '}
                  {groupedMenu.orphans.length === 1 ? 'item' : 'itens'}
                </span>
              </span>
              <span className="category-accordion-chevron" aria-hidden="true" />
            </button>
            <div className="category-accordion-panel">
              <div className="admin-list admin-list--nested">
                {groupedMenu.orphans.map((item) => (
                  <article key={item.id} className="admin-item">
                    <div className="admin-item-body">
                      <strong className="admin-item-name">{item.name}</strong>
                      <p className="admin-item-meta-row">
                        <span className="admin-item-muted">
                          Categoria no banco: {item.category || '—'}
                        </span>
                      </p>
                      <p className="admin-item-description">{item.description}</p>
                      <AdminItemPricing item={item} />
                    </div>
                    <div className="admin-item-actions">
                      <button type="button" className="edit-btn" onClick={() => onEdit(item)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => onRemove(item.id, item.name)}>
                        Remover
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  )
}

function AdminTablesSection({ tables, tableNumber, setTableNumber, onAddTable, onRemoveTable }) {
  return (
    <section className="tables-admin admin-tab-panel-inner">
      <header className="admin-panel-header">
        <h3>QR Codes das mesas</h3>
        <p>Primeiro cadastre as mesas abaixo. Depois abra a pagina de QR para imprimir um codigo por mesa.</p>
      </header>

      <form onSubmit={onAddTable} className="table-form">
        <input
          type="number"
          min="1"
          value={tableNumber}
          onChange={(event) => setTableNumber(event.target.value)}
          placeholder="Numero da mesa"
        />
        <button type="submit" className="admin-btn admin-btn-primary">
          Adicionar mesa
        </button>
        <Link to="/qrcodes" className="admin-btn admin-btn-outline admin-link-btn">
          Abrir pagina de QR Codes
        </Link>
      </form>

      <div className="table-list">
        {tables.length === 0 ? (
          <p className="admin-items-empty">Nenhuma mesa cadastrada ainda.</p>
        ) : (
          tables.map((table) => (
            <article key={table} className="table-item">
              <span>Mesa #{table}</span>
              <button type="button" onClick={() => onRemoveTable(table)}>
                Remover
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function AdminPage({
  menuItems,
  categories,
  setCategories,
  saveCategories,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  menuSyncMessage,
  tables,
  saveTables,
}) {
  const [newItemForm, setNewItemForm] = useState(emptyItemForm)
  const [editForm, setEditForm] = useState(emptyItemForm)
  const [editingId, setEditingId] = useState(null)
  const [tableNumber, setTableNumber] = useState('')
  const [isSavingNewItem, setIsSavingNewItem] = useState(false)
  const [isSavingEditItem, setIsSavingEditItem] = useState(false)
  const [itemModal, setItemModal] = useState(null)
  const [openItemsCategoryId, setOpenItemsCategoryId] = useState(null)
  const [adminTab, setAdminTab] = useState('itens')
  const closeItemModal = () => setItemModal(null)

  const groupedMenu = useMemo(
    () => groupMenuItemsForAdmin(menuItems, categories),
    [menuItems, categories],
  )

  const newItemCategory = categories.find((category) => category.id === newItemForm.category)
  const newSubcategoryOptions = newItemCategory?.subcategories || []
  const editItemCategory = categories.find((category) => category.id === editForm.category)
  const editSubcategoryOptions = editItemCategory?.subcategories || []

  const makeFormChangeHandler = (setFormState) => (event) => {
    const { name, value } = event.target
    setFormState((current) => {
      if (name === 'category') {
        return {
          ...current,
          category: value,
          subcategory: '',
          price: isPizzaCategory(value) ? '' : current.price,
          sizePrices: isPizzaCategory(value) ? emptySizePrices() : emptySizePrices(),
        }
      }
      return { ...current, [name]: value }
    })
  }

  const makeSizePriceChangeHandler = (setFormState) => (sizeId, value) => {
    const masked = applyPriceMask(value)
    setFormState((current) => ({
      ...current,
      sizePrices: { ...current.sizePrices, [sizeId]: masked },
    }))
  }

  const makeImageUploadHandler = (setFormState) => (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setFormState((current) => ({
        ...current,
        image: typeof reader.result === 'string' ? reader.result : current.image,
      }))
    }
    reader.readAsDataURL(file)
  }

  const makePriceChangeHandler = (setFormState) => (event) => {
    const value = applyPriceMask(event.target.value)
    setFormState((current) => ({ ...current, price: value }))
  }

  const resetNewItemForm = () => {
    setNewItemForm({
      ...emptyItemForm,
      category: categories[0]?.id || 'pizzas',
      subcategory: '',
      sizePrices: emptySizePrices(),
    })
  }

  const closeEditModal = () => {
    setEditingId(null)
    setEditForm({ ...emptyItemForm, sizePrices: emptySizePrices() })
  }

  const startEdit = (item) => {
    setEditingId(normalizeItemId(item.id))
    setEditForm(buildItemFormFromMenuItem(item))
    setOpenItemsCategoryId(item.category)
    setAdminTab('itens')
  }

  const toggleItemsCategoryPanel = (categoryId) => {
    setOpenItemsCategoryId((current) => (current === categoryId ? null : categoryId))
  }

  const validateItemForm = (form, subcategoryOptions) => {
    if (!form.name.trim()) {
      return {
        error: {
          variant: 'error',
          title: 'Nome obrigatorio',
          description: 'Informe o nome do item para continuar.',
        },
      }
    }
    if (!form.description.trim()) {
      return {
        error: {
          variant: 'error',
          title: 'Descricao obrigatoria',
          description: 'Informe a descricao do item para continuar.',
        },
      }
    }

    const basePayload = {
      category: form.category,
      subcategory: subcategoryOptions.length > 0 ? form.subcategory || '' : '',
      name: form.name.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
    }

    if (isPizzaCategory(form.category)) {
      const sizes = buildSizesFromForm(form.category, 0, form.sizePrices)
      const invalid = sizes.find((size) => !size.price || size.price <= 0)
      if (invalid) {
        return {
          error: {
            variant: 'error',
            title: 'Precos dos tamanhos',
            description: 'Informe preco valido para Broto, Media e Grande.',
          },
        }
      }

      return {
        payload: {
          ...basePayload,
          sizes,
          price: Math.min(...sizes.map((size) => size.price)),
        },
      }
    }

    const parsedPrice = parsePriceInput(form.price)
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return {
        error: {
          variant: 'error',
          title: 'Preco invalido',
          description: 'Informe um preco valido (ex: 49,90).',
        },
      }
    }

    return {
      payload: {
        ...basePayload,
        price: parsedPrice,
        sizes: [],
      },
    }
  }

  const handleNewItemSubmit = async (event) => {
    event.preventDefault()
    const validation = validateItemForm(newItemForm, newSubcategoryOptions)
    if (validation.error) {
      setItemModal(validation.error)
      return
    }

    setIsSavingNewItem(true)
    try {
      await createMenuItem(validation.payload)
      setItemModal({
        variant: 'success',
        title: 'Item cadastrado',
        description: `"${validation.payload.name}" foi salvo no banco com sucesso.`,
      })
      resetNewItemForm()
      setAdminTab('itens')
    } catch (error) {
      setItemModal({
        variant: 'error',
        title: 'Erro ao salvar',
        description:
          error?.message ||
          'Nao foi possivel gravar no banco. Verifique se a API esta rodando.',
      })
    } finally {
      setIsSavingNewItem(false)
    }
  }

  const handleEditItemSubmit = async (event) => {
    event.preventDefault()
    const validation = validateItemForm(editForm, editSubcategoryOptions)
    if (validation.error) {
      setItemModal(validation.error)
      return
    }

    setIsSavingEditItem(true)
    try {
      await updateMenuItem(editingId, validation.payload)
      closeEditModal()
      setItemModal({
        variant: 'success',
        title: 'Item atualizado',
        description: `"${validation.payload.name}" foi alterado e salvo no banco.`,
      })
    } catch (error) {
      setItemModal({
        variant: 'error',
        title: 'Erro ao atualizar',
        description:
          error?.message ||
          'Nao foi possivel gravar no banco. Verifique se a API esta rodando.',
      })
    } finally {
      setIsSavingEditItem(false)
    }
  }

  const removeItem = async (id, itemName) => {
    try {
      await deleteMenuItem(id)
      setItemModal({
        variant: 'success',
        title: 'Item removido',
        description: `"${itemName}" foi excluido do cardapio.`,
      })
    } catch {
      setItemModal({
        variant: 'error',
        title: 'Erro ao remover',
        description: 'Nao foi possivel remover o produto. Tente novamente.',
      })
    }
  }

  const addTable = (event) => {
    event.preventDefault()
    const parsed = Number(tableNumber)

    if (!Number.isInteger(parsed) || parsed <= 0 || tables.includes(parsed)) {
      return
    }

    saveTables([...tables, parsed])
    setTableNumber('')
  }

  const removeTable = (table) => {
    saveTables(tables.filter((item) => item !== table))
  }

  return (
    <section className="admin">
      <header className="admin-page-header">
        <h2>Painel Admin</h2>
        <p>Escolha uma secao abaixo: cadastro, lista, categorias ou mesas.</p>
        {menuSyncMessage && <p className="menu-sync-message">{menuSyncMessage}</p>}
      </header>

      <nav className="admin-tabs" role="tablist" aria-label="Secoes do admin">
        {ADMIN_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={adminTab === section.id}
            className={`admin-tab${adminTab === section.id ? ' is-active' : ''}`}
            onClick={() => setAdminTab(section.id)}
          >
            <span className="admin-tab-label">{section.label}</span>
            <span className="admin-tab-hint">{section.hint}</span>
          </button>
        ))}
      </nav>

      <div className="admin-tab-content">
        {adminTab === 'categorias' && (
          <div role="tabpanel" className="admin-tab-panel">
            <CategoriesAdmin
              categories={categories}
              setCategories={setCategories}
              saveCategories={saveCategories}
            />
          </div>
        )}

        {adminTab === 'novo' && (
          <div role="tabpanel" className="admin-tab-panel">
            <header className="admin-panel-header">
              <h3>Novo item</h3>
              <p>Preencha os dados e salve para adicionar ao cardapio.</p>
            </header>
            <form onSubmit={handleNewItemSubmit} className="admin-form">
              <AdminItemFormFields
                form={newItemForm}
                categories={categories}
                subcategoryOptions={newSubcategoryOptions}
                onChange={makeFormChangeHandler(setNewItemForm)}
                onPriceChange={makePriceChangeHandler(setNewItemForm)}
                onSizePriceChange={makeSizePriceChangeHandler(setNewItemForm)}
                onImageUpload={makeImageUploadHandler(setNewItemForm)}
              />
              <div className="admin-form-actions">
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={isSavingNewItem}
                >
                  {isSavingNewItem ? 'Salvando...' : 'Salvar item'}
                </button>
              </div>
            </form>

            {newItemForm.image && (
              <div className="image-preview">
                <p>Pre-visualizacao da foto</p>
                <img src={newItemForm.image} alt="Preview do item" />
              </div>
            )}
          </div>
        )}

        {adminTab === 'itens' && (
          <div role="tabpanel" className="admin-tab-panel">
            <AdminItemsCatalog
              groupedMenu={groupedMenu}
              openItemsCategoryId={openItemsCategoryId}
              onToggleCategory={toggleItemsCategoryPanel}
              onEdit={startEdit}
              onRemove={removeItem}
            />
          </div>
        )}

        {adminTab === 'qrcodes' && (
          <div role="tabpanel" className="admin-tab-panel">
            <AdminTablesSection
              tables={tables}
              tableNumber={tableNumber}
              setTableNumber={setTableNumber}
              onAddTable={addTable}
              onRemoveTable={removeTable}
            />
          </div>
        )}
      </div>

      <AdminEditItemModal
        editingId={editingId}
        form={editForm}
        categories={categories}
        subcategoryOptions={editSubcategoryOptions}
        isSaving={isSavingEditItem}
        onClose={closeEditModal}
        onSubmit={handleEditItemSubmit}
        onChange={makeFormChangeHandler(setEditForm)}
        onPriceChange={makePriceChangeHandler(setEditForm)}
        onSizePriceChange={makeSizePriceChangeHandler(setEditForm)}
        onImageUpload={makeImageUploadHandler(setEditForm)}
      />

      <AdminFeedbackModal modal={itemModal} onClose={closeItemModal} />
    </section>
  )
}

export default App
