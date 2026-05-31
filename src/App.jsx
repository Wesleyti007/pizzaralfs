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
import {
  formatOrderDateTime,
  formatOrderMoney,
  isOrderCancelled,
  isOrderPrinted,
  ORDER_STATUS,
  orderStatusBadgeClass,
  orderStatusLabel,
  dateInputDaysAgo,
  fetchOrdersReport,
  patchOrderDetails,
  patchOrderStatus,
  todayDateInputValue,
} from './orders.js'
import { printOrderDocument } from './orderPrint.js'
import { downloadOrdersReportExcel } from './reportExport.js'
import { downloadOrderReceiptImage } from './orderReceiptImage.js'
import { PizzaSlicePicker } from './PizzaSlicePicker.jsx'
import {
  formatPhoneDisplay,
  getDeliveryFieldErrors,
  isDeliveryOrder,
  loadDeliveryInfoFromSession,
  normalizePhoneDigits,
  saveDeliveryInfoToSession,
  validateDeliveryInfo,
} from './delivery.js'

export const DEFAULT_DELIVERY_SETTINGS = {
  deliveryFee: 0,
  establishmentCep: '',
  establishmentStreet: '',
  establishmentNumber: '',
  establishmentNeighborhood: '',
  establishmentCity: '',
  establishmentState: '',
  deliveryPricePerKm: 0,
}
import {
  DEFAULT_CATEGORIES,
  catalogPathWithMesa,
  filterMenuByCatalog,
  filterMenuItemsForAdmin,
  getCategoryLabel,
  persistTableNumber,
  resolveActiveTableNumber,
  getItemCategoryLabel,
  getSubcategoryLabel,
  applyPriceMask,
  buildMultiFlavorCartName,
  buildSizePricesFromItem,
  buildSizesFromForm,
  computeMultiFlavorPrice,
  emptySizePrices,
  formatPriceForInput,
  formatPriceRangeLabel,
  getCombinablePizzaFlavors,
  getMaxFlavorsForSize,
  getPiecesForSize,
  isCombinablePizzaItem,
  multiFlavorCartKey,
  normalizeFlavorIdList,
  parsePriceInput,
  groupMenuItemsForAdmin,
  hasMenuItemImage,
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
import { calcCartTotals, computeMultiFlavorPriceForMode, resolveUnitPrice } from './pricing.js'
import {
  MENU_IMAGE_HEIGHT,
  MENU_IMAGE_WIDTH,
  normalizeMenuImageFile,
  normalizeMenuImageSource,
} from './menuImage.js'

const STORAGE_KEY = 'pizza-ralfs-menu'
const CATEGORIES_STORAGE_KEY = 'pizza-ralfs-categories'
const TABLES_STORAGE_KEY = 'pizza-ralfs-tables'
const AUTH_STORAGE_KEY = 'pizza-ralfs-auth'
const ADMIN_PATH = '/admin/ralfs'
const ADMIN_USER = String(import.meta.env.VITE_ADMIN_USER || 'admin').trim()
const ADMIN_PASSWORD = String(import.meta.env.VITE_ADMIN_PASSWORD || '25364758@Cd').trim()
const HOME_SPLASH_MS = 4000
const HOME_SPLASH_FADE_MS = 400
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const LOGO_URL = '/logo-ralfs-web.png'

const CatalogSplashContext = createContext('hidden')

const CatalogReceiptContext = createContext(null)

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

function getCartFlavorIds(item) {
  if (Array.isArray(item.flavorIds) && item.flavorIds.length > 0) {
    return normalizeFlavorIdList(item.flavorIds)
  }
  if (item.secondFlavorId) {
    return normalizeFlavorIdList([item.id, item.secondFlavorId])
  }
  return normalizeFlavorIdList([item.id])
}

function sameCartLine(left, right) {
  if ((left.sizeId || '') !== (right.sizeId || '')) return false
  const leftKey = multiFlavorCartKey(getCartFlavorIds(left), left.sizeId || '')
  const rightKey = multiFlavorCartKey(getCartFlavorIds(right), right.sizeId || '')
  return leftKey === rightKey
}

function cartLineKey(item) {
  return multiFlavorCartKey(getCartFlavorIds(item), item.sizeId || '')
}

function AdminSearchBar({
  value,
  onChange,
  placeholder = 'Buscar por nome, descrição ou categoria...',
  resultCount = null,
  id = 'catalog-search',
}) {
  const trimmed = value.trim()

  return (
    <div className="catalog-search">
      <label className="catalog-search-label" htmlFor={id}>
        <span className="catalog-search-prefix" aria-hidden="true">
          Buscar
        </span>
        <input
          id={id}
          type="search"
          className="catalog-search-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
        />
        {trimmed && (
          <button
            type="button"
            className="catalog-search-clear"
            onClick={() => onChange('')}
            aria-label="Limpar busca"
          >
            ×
          </button>
        )}
      </label>
      {trimmed && resultCount !== null && (
        <p className="catalog-search-meta" role="status">
          {resultCount === 0
            ? 'Nenhum item encontrado.'
            : `${resultCount} ${resultCount === 1 ? 'item encontrado' : 'itens encontrados'}`}
        </p>
      )}
    </div>
  )
}

function formatBRL(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'R$ 0,00'
  return `R$ ${numeric.toFixed(2).replace('.', ',')}`
}

function formatApiError(error, fallback) {
  const message = String(error?.message || '').trim()
  if (!message) return fallback

  if (
    message === 'Failed to fetch' ||
    message.includes('NetworkError') ||
    message.includes('Load failed')
  ) {
    return 'API offline. Rode: npm run dev:all (ou cd backend && npm run dev)'
  }

  return message
}

async function readApiErrorMessage(response, fallback) {
  try {
    const errorBody = await response.json()
    if (errorBody?.detail) return `${errorBody.message}: ${errorBody.detail}`
    if (errorBody?.message) return errorBody.message
  } catch {
    if (response.status === 404) {
      return 'Rota da API não encontrada. Reinicie o backend: cd backend && npm run dev'
    }
  }
  return fallback
}

/** Payload completo para PUT /menu-items/:id (ex.: fallback ao ativar/desativar). */
function buildMenuItemApiPayload(item, isActive) {
  const payload = {
    category: item.category,
    subcategory: item.subcategory || '',
    name: item.name,
    description: item.description || '',
    image: typeof item.image === 'string' ? item.image : '',
    isActive: isActive !== false,
  }

  if (isPizzaCategory(item.category)) {
    const sizes = Array.isArray(item.sizes) ? item.sizes : []
    payload.sizes = sizes
    const prices = sizes.map((size) => Number(size.price)).filter((n) => Number.isFinite(n) && n > 0)
    payload.price = prices.length ? Math.min(...prices) : Number(item.price) || 0
  } else {
    payload.price = Number(item.price)
    const delivery = Number(item.deliveryPrice)
    payload.deliveryPrice =
      Number.isFinite(delivery) && delivery > 0 ? delivery : null
    payload.sizes = []
  }

  return payload
}

function normalizeMenuItems(items, categories) {
  return items.map((item) => {
    const normalized = normalizeMenuItemCategories(item, categories)
    return {
      ...normalizeMenuItemSizes(normalized),
      id: normalizeItemId(item.id),
      image: typeof item.image === 'string' ? item.image : '',
      isActive: item.isActive !== false,
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
  const [deliverySettings, setDeliverySettings] = useState(() => ({ ...DEFAULT_DELIVERY_SETTINGS }))

  const saveTables = (items) => {
    const normalized = Array.from(new Set(items)).sort((a, b) => a - b)
    setTables(normalized)
    localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(normalized))
  }

  useEffect(() => {
    let cancelled = false
    const menuQuery = isAuthenticated ? '?all=1' : ''

    const loadDataFromApi = async () => {
      let nextCategories = categories

      try {
        const [categoriesResponse, settingsResponse, menuResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/categories`),
          fetch(`${API_BASE_URL}/settings`),
          fetch(`${API_BASE_URL}/menu-items${menuQuery}`),
        ])

        if (cancelled) return

        if (categoriesResponse.ok) {
          const apiCategories = await categoriesResponse.json()
          nextCategories = normalizeCategories(apiCategories)
          setCategories(nextCategories)
          localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(nextCategories))
        }

        if (settingsResponse.ok) {
          const settings = await settingsResponse.json()
          setDeliverySettings({
            ...DEFAULT_DELIVERY_SETTINGS,
            ...settings,
            deliveryFee: Math.max(0, Number(settings.deliveryFee) || 0),
            deliveryPricePerKm: Math.max(0, Number(settings.deliveryPricePerKm) || 0),
          })
        }

        if (menuResponse.ok) {
          const items = await menuResponse.json()
          if (Array.isArray(items) && items.length > 0) {
            const normalizedItems = normalizeMenuItems(items, nextCategories)
            setMenuItems(normalizedItems)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedItems))
            setMenuSyncMessage('')
          } else {
            setMenuSyncMessage('Nenhum produto na API. Usando cardápio local.')
          }
        } else {
          throw new Error('Falha ao carregar produtos')
        }
      } catch {
        if (!cancelled) {
          setMenuSyncMessage('Sem conexão com a API. Usando cardápio local.')
        }
      }
    }

    loadDataFromApi()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const saveDeliverySettings = async (settingsPayload) => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsPayload),
    })
    if (!response.ok) {
      throw new Error('Falha ao salvar configurações de delivery')
    }
    const saved = await response.json()
    setDeliverySettings({ ...DEFAULT_DELIVERY_SETTINGS, ...saved })
    return saved
  }

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

  const setMenuItemActive = async (itemId, isActive) => {
    const response = await fetch(`${API_BASE_URL}/menu-items/${itemId}/active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: Boolean(isActive) }),
    })

    if (response.status === 404 || response.status === 405) {
      const item = menuItems.find((entry) => sameItemId(entry.id, itemId))
      if (!item) {
        throw new Error('Item não encontrado no cardápio.')
      }
      await updateMenuItem(itemId, buildMenuItemApiPayload(item, isActive))
      return menuItems.find((entry) => sameItemId(entry.id, itemId))
    }

    if (!response.ok) {
      throw new Error(
        await readApiErrorMessage(response, 'Falha ao atualizar status do item'),
      )
    }

    const updatedItem = await response.json()
    const updated = normalizeMenuItems(
      menuItems.map((item) => (sameItemId(item.id, itemId) ? updatedItem : item)),
      categories,
    )
    setMenuItems(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setMenuSyncMessage('')
    return updatedItem
  }

  const handleLogin = (username, password) => {
    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
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
      <CatalogReceiptProvider>
      <div className="app">
        <BrandHeader isAuthenticated={isAuthenticated} onLogout={handleLogout} />

        <main>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  menuItems={menuItems}
                  tables={tables}
                  categories={categories}
                  deliverySettings={deliverySettings}
                />
              }
            />
            <Route
              path="/categoria/:categoryId"
              element={
                <HomePage
                  menuItems={menuItems}
                  tables={tables}
                  categories={categories}
                  deliverySettings={deliverySettings}
                />
              }
            />
            <Route
              path="/categoria/:categoryId/:subcategoryId"
              element={
                <HomePage
                  menuItems={menuItems}
                  tables={tables}
                  categories={categories}
                  deliverySettings={deliverySettings}
                />
              }
            />
            <Route path="/admin" element={<Navigate to={ADMIN_PATH} replace />} />
            <Route path="/admin/" element={<Navigate to={ADMIN_PATH} replace />} />
            <Route
              path="/acesso-admin-ralfs-2026"
              element={<Navigate to={ADMIN_PATH} replace />}
            />
            <Route
              path={ADMIN_PATH}
              element={
                isAuthenticated ? (
                  <AdminPage
                    menuItems={menuItems}
                    categories={categories}
                    setCategories={setCategories}
                    saveCategories={saveCategories}
                    createMenuItem={createMenuItem}
                    updateMenuItem={updateMenuItem}
                    deleteMenuItem={deleteMenuItem}
                    setMenuItemActive={setMenuItemActive}
                    menuSyncMessage={menuSyncMessage}
                    tables={tables}
                    saveTables={saveTables}
                    deliverySettings={deliverySettings}
                    saveDeliverySettings={saveDeliverySettings}
                  />
                ) : (
                  <LoginPage onLogin={handleLogin} />
                )
              }
            />
            <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
            <Route path="/pedidos" element={<OrdersPage />} />
            <Route path="/relatorios" element={<ReportsPage />} />
            <Route path="/qrcodes" element={<QrCodesPage tables={tables} />} />
            </Route>
            <Route path="*" element={<UnknownRoutePage />} />
          </Routes>
        </main>
      </div>
      </CatalogReceiptProvider>
      </CatalogSplashProvider>
    </BrowserRouter>
  )
}

function BrandHeader({ isAuthenticated, onLogout }) {
  const location = useLocation()
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  )
  const mesa = resolveActiveTableNumber(searchParams)
  const catalogTo = catalogPathWithMesa('/', mesa)

  return (
    <header className="brand-header">
      <Link to={catalogTo} className="brand-header-logo">
        <img src={LOGO_URL} alt="Pizzas Ralf's" width={120} height={120} decoding="async" />
      </Link>
      <div className="brand-header-text">
        <p className="brand-header-kicker">Sabor tradicional</p>
        <h1 className="brand-header-title">Pizzas Ralf&apos;s</h1>
      </div>
      <nav className="brand-header-nav">
        <Link to={catalogTo}>Cardápio</Link>
        {isAuthenticated ? (
          <>
            <Link to={ADMIN_PATH}>Admin</Link>
            <Link to="/pedidos">Pedidos</Link>
            <Link to="/relatorios">Relatórios</Link>
            <button type="button" className="nav-btn" onClick={onLogout}>
              Sair
            </button>
          </>
        ) : null}
      </nav>
    </header>
  )
}

function CatalogReceiptProvider({ children }) {
  const location = useLocation()
  const [receiptOrder, setReceiptOrder] = useState(null)
  const [orderSuccessMessage, setOrderSuccessMessage] = useState('')
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)

  useEffect(() => {
    if (!isCatalogRoute(location.pathname)) {
      setReceiptOrder(null)
      setOrderSuccessMessage('')
    }
  }, [location.pathname])

  const value = useMemo(
    () => ({
      receiptOrder,
      setReceiptOrder,
      orderSuccessMessage,
      setOrderSuccessMessage,
      isDownloadingReceipt,
      setIsDownloadingReceipt,
    }),
    [receiptOrder, orderSuccessMessage, isDownloadingReceipt],
  )

  return (
    <CatalogReceiptContext.Provider value={value}>{children}</CatalogReceiptContext.Provider>
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
    return <Navigate to={ADMIN_PATH} replace />
  }
  return <Outlet />
}

function UnknownRoutePage() {
  const location = useLocation()

  return (
    <section className="login-page unknown-route-page">
      <h2>Página não encontrada</h2>
      <p className="unknown-route-path">
        Endereço: <code>{location.pathname}</code>
      </p>
      <p>
        O painel admin fica em <strong>{ADMIN_PATH}</strong>. URLs antigas (/admin, /acesso-admin-ralfs-2026)
        redirecionam automaticamente após atualizar o site.
      </p>
      <p className="unknown-route-links">
        <Link to={ADMIN_PATH}>Ir para {ADMIN_PATH}</Link>
        <Link to="/">Cardápio</Link>
      </p>
    </section>
  )
}

function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const ok = onLogin(form.username.trim(), form.password)
    if (!ok) {
      setError('Usuário ou senha inválidos.')
    }
  }

  return (
    <section className="login-page">
      <h2>Login Admin</h2>
      <p>Acesso restrito para Admin e Pedidos.</p>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Usuário"
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
  isDelivery,
  deliveryInfo,
  onDeliveryFieldChange,
  deliveryFieldErrors,
  deliveryFieldError,
  subtotal,
  deliveryFee,
  total,
  observation,
  setObservation,
  isSubmittingOrder,
  orderMessage,
  changeQuantity,
  finalizeOrder,
  onClose,
  formatBRL,
  canFinalize,
}) {
  const observationId = onClose ? 'order-observation-mobile' : 'order-observation'
  const nameId = onClose ? 'delivery-name-mobile' : 'delivery-name'
  const phoneId = onClose ? 'delivery-phone-mobile' : 'delivery-phone'
  const addressId = onClose ? 'delivery-address-mobile' : 'delivery-address'
  const referenceId = onClose ? 'delivery-reference-mobile' : 'delivery-reference'
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
        {cart.length === 0 && <p className="order-empty-msg">Sua cesta está vazia.</p>}

        {cart.map((item) => (
          <div key={cartLineKey(item)} className="basket-item">
            <div>
              <strong>{item.name}</strong>
              {getCartFlavorIds(item).length > 1 && (
                <span className="basket-item-half-note">
                  {getCartFlavorIds(item).length} sabores
                </span>
              )}
              {item.sizeLabel && getCartFlavorIds(item).length <= 1 && (
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
          {isDelivery && (
            <div className="delivery-fields">
              <p className="delivery-fields-title">Entrega (delivery)</p>
              <p className="delivery-fields-hint">
                Taxa de entrega fixa conforme configurado no estabelecimento.
              </p>
              <label className="observation-label" htmlFor={nameId}>
                Nome <span className="required-mark">*</span>
              </label>
              <input
                id={nameId}
                name="name"
                type="text"
                className={`delivery-input${deliveryFieldErrors.customerName ? ' delivery-input--invalid' : ''}`}
                autoComplete="name"
                required
                aria-required="true"
                aria-invalid={deliveryFieldErrors.customerName ? 'true' : undefined}
                value={deliveryInfo.customerName}
                onChange={(event) => onDeliveryFieldChange('customerName', event.target.value)}
                placeholder="Seu nome"
              />
              {deliveryFieldErrors.customerName && (
                <p className="delivery-field-error">{deliveryFieldErrors.customerName}</p>
              )}
              <label className="observation-label" htmlFor={phoneId}>
                WhatsApp <span className="required-mark">*</span>
              </label>
              <input
                id={phoneId}
                name="tel"
                type="tel"
                className={`delivery-input${deliveryFieldErrors.customerPhone ? ' delivery-input--invalid' : ''}`}
                autoComplete="tel"
                inputMode="tel"
                required
                aria-required="true"
                aria-invalid={deliveryFieldErrors.customerPhone ? 'true' : undefined}
                value={deliveryInfo.customerPhone}
                onChange={(event) => onDeliveryFieldChange('customerPhone', event.target.value)}
                placeholder="(11) 99999-9999"
              />
              {deliveryFieldErrors.customerPhone && (
                <p className="delivery-field-error">{deliveryFieldErrors.customerPhone}</p>
              )}
              <label className="observation-label" htmlFor={addressId}>
                Endereço de entrega <span className="required-mark">*</span>
              </label>
              <input
                id={addressId}
                name="street-address"
                type="text"
                className={`delivery-input${deliveryFieldErrors.deliveryAddress ? ' delivery-input--invalid' : ''}`}
                autoComplete="street-address"
                required
                value={deliveryInfo.deliveryAddress}
                onChange={(event) =>
                  onDeliveryFieldChange('deliveryAddress', event.target.value)
                }
                placeholder="Rua, número, bairro, cidade"
              />
              {deliveryFieldErrors.deliveryAddress && (
                <p className="delivery-field-error">{deliveryFieldErrors.deliveryAddress}</p>
              )}
              <label className="observation-label" htmlFor={referenceId}>
                Ponto de referência <span className="required-mark">*</span>
              </label>
              <input
                id={referenceId}
                name="delivery-reference"
                type="text"
                className={`delivery-input${deliveryFieldErrors.deliveryReference ? ' delivery-input--invalid' : ''}`}
                autoComplete="off"
                required
                aria-required="true"
                aria-invalid={deliveryFieldErrors.deliveryReference ? 'true' : undefined}
                value={deliveryInfo.deliveryReference}
                onChange={(event) =>
                  onDeliveryFieldChange('deliveryReference', event.target.value)
                }
                placeholder="Ex: portão azul, casa dos fundos"
              />
              {deliveryFieldErrors.deliveryReference && (
                <p className="delivery-field-error">{deliveryFieldErrors.deliveryReference}</p>
              )}
              {deliveryFieldError && <p className="order-message">{deliveryFieldError}</p>}
            </div>
          )}
          <div className="order-totals-breakdown">
            <p className="order-subtotal">
              Subtotal: R$ {subtotal.toFixed(2)}
            </p>
            {isDelivery && (
              <p className="order-delivery-fee">Taxa de entrega: R$ {deliveryFee.toFixed(2)}</p>
            )}
            <h3 className="order-total">Total: R$ {total.toFixed(2)}</h3>
          </div>
          <label className="observation-label" htmlFor={observationId}>
            Observação do pedido
          </label>
          <textarea
            id={observationId}
            className="observation-input"
            value={observation}
            onChange={(event) => setObservation(event.target.value)}
            placeholder="Ex: sem cebola, massa bem assada, trocar refrigerante..."
          />
          <button
            type="button"
            className="btn-primary"
            onClick={finalizeOrder}
            disabled={cart.length === 0 || isSubmittingOrder || !canFinalize}
          >
            {isSubmittingOrder ? 'Enviando...' : isDelivery ? 'Finalizar delivery' : 'Finalizar pedido'}
          </button>
          {orderMessage && <p className="order-message">{orderMessage}</p>}
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
      aria-label="Carregando cardápio"
    >
      <div className="home-splash-inner">
        <img
          src={LOGO_URL}
          alt="Pizzas Ralf's"
          className="home-splash-logo"
          width={200}
          height={200}
          decoding="async"
          fetchPriority="high"
        />
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

function MenuItemCard({
  menuItem,
  onAddToCart,
  pizzaItems = [],
  categories = [],
  forDelivery = false,
}) {
  const hasSizes = itemHasSizes(menuItem)
  const [selectedSizeId, setSelectedSizeId] = useState(
    () => menuItem.sizes?.[0]?.id || 'broto',
  )
  const [selectedFlavorIds, setSelectedFlavorIds] = useState(() => [
    normalizeItemId(menuItem.id),
  ])

  const selectedSize =
    menuItem.sizes?.find((size) => size.id === selectedSizeId) || menuItem.sizes?.[0]
  const pieceCount = getPiecesForSize(selectedSizeId, menuItem.sizes)
  const maxFlavors = getMaxFlavorsForSize(selectedSizeId)
  const unitPrice = hasSizes
    ? resolveUnitPrice(menuItem, selectedSizeId, forDelivery)
    : resolveUnitPrice(menuItem, '', forDelivery)

  const pizzaById = useMemo(() => {
    const map = new Map()
    for (const item of pizzaItems) {
      map.set(normalizeItemId(item.id), item)
    }
    map.set(normalizeItemId(menuItem.id), menuItem)
    return map
  }, [pizzaItems, menuItem])

  const otherPizzaOptions = useMemo(
    () =>
      getCombinablePizzaFlavors(pizzaItems, categories, {
        excludeItemId: normalizeItemId(menuItem.id),
      }),
    [pizzaItems, categories, menuItem.id],
  )

  const selectedFlavors = useMemo(
    () =>
      normalizeFlavorIdList(selectedFlavorIds)
        .map((id) => pizzaById.get(id))
        .filter(Boolean),
    [selectedFlavorIds, pizzaById],
  )

  const displayPrice = useMemo(() => {
    if (selectedFlavors.length <= 1) return unitPrice
    return computeMultiFlavorPriceForMode(
      pizzaById,
      selectedFlavorIds,
      selectedSizeId,
      forDelivery,
    )
  }, [selectedFlavors.length, selectedFlavorIds, pizzaById, selectedSizeId, unitPrice, forDelivery])

  const handleSizeChange = (sizeId) => {
    setSelectedSizeId(sizeId)
    const max = getMaxFlavorsForSize(sizeId)
    setSelectedFlavorIds((current) => {
      const trimmed = normalizeFlavorIdList(current).slice(0, max)
      const primary = normalizeItemId(menuItem.id)
      if (!trimmed.includes(primary)) return [primary, ...trimmed].slice(0, max)
      return trimmed.length ? trimmed : [primary]
    })
  }

  const handleAddFlavor = (flavorId) => {
    const id = normalizeItemId(flavorId)
    if (!id) return
    setSelectedFlavorIds((current) => {
      const next = normalizeFlavorIdList([...current, id])
      return next.slice(0, maxFlavors)
    })
  }

  const handleRemoveFlavor = (flavorId) => {
    const id = normalizeItemId(flavorId)
    if (sameItemId(id, menuItem.id)) return
    setSelectedFlavorIds((current) =>
      normalizeFlavorIdList(current).filter((entry) => !sameItemId(entry, id)),
    )
  }

  const handleAdd = () => {
    const sizeLabel = selectedSize
      ? `${selectedSize.label} (${selectedSize.pieces} pedaços)`
      : ''
    const flavorIds = normalizeFlavorIdList(selectedFlavorIds)
    const flavorItems = flavorIds.map((id) => pizzaById.get(id)).filter(Boolean)
    const name =
      flavorItems.length > 1
        ? buildMultiFlavorCartName(flavorItems, sizeLabel)
        : sizeLabel
          ? `${menuItem.name} — ${selectedSize.label}`
          : menuItem.name

    onAddToCart({
      ...menuItem,
      price: displayPrice,
      sizeId: selectedSize?.id || '',
      sizeLabel,
      flavorIds,
      secondFlavorId: flavorIds[1] || '',
      name,
    })
  }

  const addDisabled = selectedFlavors.length === 0
  const showImage = hasMenuItemImage(menuItem.image)
  const placeholderStyle = showImage
    ? undefined
    : { '--placeholder-logo': `url(${LOGO_URL})` }

  return (
    <article className="card">
      <div
        className={`card-media${showImage ? ' card-media--has-image' : ' card-media--placeholder'}`}
        style={
          showImage
            ? { '--card-image': `url(${JSON.stringify(menuItem.image.trim())})` }
            : placeholderStyle
        }
        role={showImage ? 'img' : undefined}
        aria-label={showImage ? menuItem.name : undefined}
      />
      <h3>{menuItem.name}</h3>
      <p className="card-description">({menuItem.description})</p>

      {hasSizes ? (
        <>
          <div className="pizza-sizes">
            <span className="pizza-sizes-label">Tamanho</span>
            <div className="pizza-sizes-options" role="group" aria-label="Tamanho da pizza">
              {menuItem.sizes.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  className={`pizza-size-btn${selectedSizeId === size.id ? ' is-active' : ''}`}
                  onClick={() => handleSizeChange(size.id)}
                >
                  <span className="pizza-size-btn-label">{size.label}</span>
                  <span className="pizza-size-btn-meta">{size.pieces} pedaços</span>
                  <span className="pizza-size-btn-price">R$ {size.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>

          <PizzaSlicePicker
            sizeId={selectedSizeId}
            pieceCount={pieceCount}
            primaryFlavor={menuItem}
            selectedFlavors={selectedFlavors}
            otherPizzaOptions={otherPizzaOptions}
            categories={categories}
            onAddFlavor={handleAddFlavor}
            onRemoveFlavor={handleRemoveFlavor}
            normalizeItemId={normalizeItemId}
            sameItemId={sameItemId}
          />
        </>
      ) : (
        <strong className="card-price">{formatPriceRangeLabel(menuItem)}</strong>
      )}

      {hasSizes && (
        <strong className="card-price card-price--selected">
          R$ {displayPrice.toFixed(2)}
        </strong>
      )}

      <button type="button" className="btn-add" onClick={handleAdd} disabled={addDisabled}>
        Adicionar
      </button>
    </article>
  )
}

function HomePage({ menuItems, tables, categories, deliverySettings = DEFAULT_DELIVERY_SETTINGS }) {
  const location = useLocation()
  const { categoryId, subcategoryId } = useParams()
  const splashPhase = useContext(CatalogSplashContext)
  const [cart, setCart] = useState([])
  const [observation, setObservation] = useState('')
  const [deliveryInfo, setDeliveryInfo] = useState(() => loadDeliveryInfoFromSession())
  const [deliveryFieldError, setDeliveryFieldError] = useState('')
  const fixedDeliveryFee = Math.max(0, Number(deliverySettings.deliveryFee) || 0)
  const {
    receiptOrder,
    setReceiptOrder,
    orderSuccessMessage,
    setOrderSuccessMessage,
    isDownloadingReceipt,
    setIsDownloadingReceipt,
  } = useContext(CatalogReceiptContext)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [orderMessage, setOrderMessage] = useState('')
  const [orderToast, setOrderToast] = useState('')
  const [orderOpen, setOrderOpen] = useState(false)
  const lastOrderBannerRef = useRef(null)
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  )
  const mesa = resolveActiveTableNumber(searchParams)
  const mesaIdentificada = mesa !== null
  const mesaCadastrada = mesaIdentificada && tables.includes(mesa)
  const isDelivery = !mesaIdentificada

  const deliveryValidation = useMemo(
    () => (isDelivery ? validateDeliveryInfo(deliveryInfo) : { ok: true }),
    [isDelivery, deliveryInfo],
  )
  const canFinalize = !isDelivery || deliveryValidation.ok
  const deliveryFieldErrors = useMemo(() => {
    if (!isDelivery || cart.length === 0) return {}
    if (deliveryValidation.ok) return {}
    return getDeliveryFieldErrors(deliveryInfo)
  }, [isDelivery, cart.length, deliveryValidation.ok, deliveryInfo])

  useEffect(() => {
    if (mesa) persistTableNumber(mesa)
  }, [mesa])

  const activeCategory = resolveActiveCategory(categories, categoryId || categories[0]?.id)
  const activeSubcategory = resolveActiveSubcategory(
    categories,
    activeCategory,
    subcategoryId,
  )
  const activeCategoryData = categories.find((category) => category.id === activeCategory)
  const filteredMenu = useMemo(
    () => filterMenuByCatalog(menuItems, categories, activeCategory, activeSubcategory),
    [menuItems, categories, activeCategory, activeSubcategory],
  )
  const pizzaMenuItems = useMemo(
    () => menuItems.filter((item) => isCombinablePizzaItem(item, categories)),
    [menuItems, categories],
  )

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

  const effectiveDeliveryFee = isDelivery ? fixedDeliveryFee : 0

  const cartTotals = useMemo(
    () => calcCartTotals(cart, { isDelivery, deliveryFee: effectiveDeliveryFee }),
    [cart, isDelivery, effectiveDeliveryFee],
  )
  const { subtotal, deliveryFee: cartDeliveryFee, total } = cartTotals
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart],
  )

  useEffect(() => {
    setOrderOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!orderToast) return undefined
    const timer = window.setTimeout(() => setOrderToast(''), 8000)
    return () => window.clearTimeout(timer)
  }, [orderToast])

  useEffect(() => {
    if (!orderOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [orderOpen])

  const downloadReceipt = async (order) => {
    if (!order || isDownloadingReceipt) return
    setIsDownloadingReceipt(true)
    try {
      await downloadOrderReceiptImage(order)
    } catch {
      setOrderMessage('Não foi possível gerar o comprovante. Tente de novo.')
    } finally {
      setIsDownloadingReceipt(false)
    }
  }

  const handleDeliveryFieldChange = (field, value) => {
    setDeliveryFieldError('')
    if (field === 'customerPhone') {
      const digits = normalizePhoneDigits(value)
      setDeliveryInfo((current) => ({
        ...current,
        customerPhone: digits.length >= 10 ? formatPhoneDisplay(digits) : value,
      }))
      return
    }
    setDeliveryInfo((current) => ({ ...current, [field]: value }))
  }

  const finalizeOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return

    let deliveryData = null
    if (isDelivery) {
      const check = validateDeliveryInfo(deliveryInfo)
      if (!check.ok) {
        setDeliveryFieldError(check.message)
        return
      }
      deliveryData = check.data
      saveDeliveryInfoToSession(deliveryInfo)
    }

    setIsSubmittingOrder(true)
    setOrderMessage('')
    setDeliveryFieldError('')

    const orderPayload = {
      mesa: mesaIdentificada ? mesa : null,
      orderType: isDelivery ? 'delivery' : 'table',
      customerName: deliveryData?.customerName || '',
      customerPhone: deliveryData?.customerPhone || '',
      deliveryAddress: deliveryData?.deliveryAddress || '',
      deliveryReference: deliveryData?.deliveryReference || '',
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
        flavorIds: getCartFlavorIds(item),
        qty: item.qty,
        price: item.price,
      })),
      itemsSubtotal: subtotal,
      deliveryFee: cartDeliveryFee,
      totalAmount: total,
    }
    const showOrderSuccess = (orderToSave) => {
      const successText = 'Pedido feito com sucesso!'
      setReceiptOrder(orderToSave)
      setOrderSuccessMessage(successText)
      setOrderToast(successText)
      setCart([])
      setObservation('')
      setOrderOpen(false)
      setOrderMessage('')
      setDeliveryFieldError('')
      window.requestAnimationFrame(() => {
        lastOrderBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
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
        let apiMessage = 'Não foi possível enviar o pedido. Tente de novo.'
        try {
          const errBody = await response.json()
          apiMessage = errBody.message || errBody.detail || apiMessage
        } catch {
          /* resposta não-JSON */
        }
        setOrderMessage(apiMessage)
        if (isDelivery) setDeliveryFieldError(apiMessage)
        return
      }

      const createdOrder = await response.json()
      const orderToSave = {
        id: createdOrder.id,
        createdAt: createdOrder.createdAt || new Date().toISOString(),
        mesa: createdOrder.tableNumber,
        orderType: createdOrder.orderType || orderPayload.orderType,
        customerName: createdOrder.customerName || '',
        customerPhone: createdOrder.customerPhone || '',
        deliveryAddress: createdOrder.deliveryAddress || '',
        deliveryReference: createdOrder.deliveryReference || '',
        observation: createdOrder.observation || '',
        items: orderPayload.items,
        itemsSubtotal: Number(createdOrder.itemsSubtotal ?? subtotal),
        deliveryFee: Number(createdOrder.deliveryFee ?? cartDeliveryFee),
        total: Number(createdOrder.totalAmount || total),
      }

      showOrderSuccess(orderToSave)
    } catch {
      setOrderMessage('Sem conexão com o servidor. Verifique a internet e tente de novo.')
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
    if (hasSubs) {
      const sub = nextSubcategoryId || 'todas'
      return catalogPathWithMesa(`/categoria/${nextCategoryId}/${sub}`, mesa)
    }
    return catalogPathWithMesa(`/categoria/${nextCategoryId}`, mesa)
  }

  const orderPanelProps = {
    cart,
    mesaValida: mesaIdentificada,
    mesa,
    isDelivery,
    deliveryInfo,
    onDeliveryFieldChange: handleDeliveryFieldChange,
    deliveryFieldErrors,
    deliveryFieldError,
    subtotal,
    deliveryFee: cartDeliveryFee,
    total,
    observation,
    setObservation,
    isSubmittingOrder,
    orderMessage,
    changeQuantity,
    finalizeOrder,
    formatBRL,
    canFinalize,
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
          <img src={LOGO_URL} alt="" />
        </div>
        {orderToast && (
          <div className="order-success-toast" role="status" aria-live="polite">
            {orderToast}
          </div>
        )}
        {receiptOrder && (
          <div
            ref={lastOrderBannerRef}
            className="last-order-banner"
            role="status"
            aria-live="polite"
          >
            <p className="order-success-heading">{orderSuccessMessage}</p>
            <span>
              Pedido #{receiptOrder.id} · Total R$ {receiptOrder.total.toFixed(2)} ·{' '}
              {new Date(receiptOrder.createdAt).toLocaleString('pt-BR')}
            </span>
            {orderMessage && <p className="order-success-note">{orderMessage}</p>}
            <span className="last-order-banner-hint">
              Baixe o comprovante em imagem agora. Ao atualizar a página ou sair do cardápio, ele
              não ficará mais disponível.
            </span>
            <button
              type="button"
              className="btn-primary last-order-banner-btn"
              disabled={isDownloadingReceipt}
              onClick={() => downloadReceipt(receiptOrder)}
            >
              {isDownloadingReceipt ? 'Gerando imagem...' : 'Baixar comprovante (PNG)'}
            </button>
          </div>
        )}
        <div className={`table-banner${isDelivery ? ' table-banner--delivery' : ''}`}>
          {mesaIdentificada ? (
            <>
              <strong>Mesa #{mesa}</strong>
              <span className="table-banner-msg">
                {mesaCadastrada
                  ? 'Pedido identificado automaticamente.'
                  : 'Mesa do QR reconhecida. Cadastre esta mesa no admin se ainda não existir.'}
              </span>
            </>
          ) : (
            <strong>Delivery</strong>
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
              pizzaItems={
                isCombinablePizzaItem(menuItem, categories) ? pizzaMenuItems : undefined
              }
              categories={categories}
              forDelivery={isDelivery}
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

const REPORT_ORDERS_PAGE_SIZE = 15

function OrdersReportTable({ title, orders, emptyMessage, variant = 'default' }) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [orders])

  if (!orders.length) {
    return (
      <section className={`report-table-block report-table-block--${variant}`}>
        <h3 className="report-table-title">{title}</h3>
        <p className="report-table-empty">{emptyMessage}</p>
      </section>
    )
  }

  const totalPages = Math.max(1, Math.ceil(orders.length / REPORT_ORDERS_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * REPORT_ORDERS_PAGE_SIZE
  const pageOrders = orders.slice(pageStart, pageStart + REPORT_ORDERS_PAGE_SIZE)
  const rangeStart = pageStart + 1
  const rangeEnd = pageStart + pageOrders.length

  return (
    <section className={`report-table-block report-table-block--${variant}`}>
      <h3 className="report-table-title">{title}</h3>
      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Data</th>
              <th>Mesa</th>
              <th>Status</th>
              <th className="report-table-num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {pageOrders.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{formatOrderDateTime(order.createdAt)}</td>
                <td>
                  {isDeliveryOrder(order.tableNumber, order.orderType) ? (
                    <span className="report-delivery-cell">
                      Delivery
                      {order.customerName ? ` · ${order.customerName}` : ''}
                    </span>
                  ) : order.tableNumber ? (
                    `Mesa ${order.tableNumber}`
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <span className={`orders-status-badge ${orderStatusBadgeClass(order.status)}`}>
                    {orderStatusLabel(order.status)}
                  </span>
                </td>
                <td className="report-table-num">{formatOrderMoney(order.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <nav className="report-table-pagination" aria-label={`Paginação: ${title}`}>
          <span className="report-table-pagination-info">
            {rangeStart}–{rangeEnd} de {orders.length}
          </span>
          <div className="report-table-pagination-actions">
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Anterior
            </button>
            <span className="report-table-pagination-page">
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              className="admin-btn admin-btn-outline"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Próxima
            </button>
          </div>
        </nav>
      )}
    </section>
  )
}

function ReportsPage() {
  const [fromDate, setFromDate] = useState(() => dateInputDaysAgo(30))
  const [toDate, setToDate] = useState(todayDateInputValue)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReport = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchOrdersReport(API_BASE_URL, fromDate, toDate)
      setReport(data)
    } catch (loadError) {
      setReport(null)
      setError(formatApiError(loadError, 'Não foi possível carregar o relatório.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [])

  const summary = report?.summary

  return (
    <section className="reports-page">
      <header className="reports-page-header">
        <div>
          <h2>Relatórios</h2>
          <p>Vendas e cancelamentos por período. Pedidos cancelados não entram no total vendido.</p>
        </div>
      </header>

      <form
        className="reports-filters admin-inline-form"
        onSubmit={(event) => {
          event.preventDefault()
          loadReport()
        }}
      >
        <label className="admin-field">
          <span className="admin-field-label">De</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            required
          />
        </label>
        <label className="admin-field">
          <span className="admin-field-label">Até</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            required
          />
        </label>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-outline"
          disabled={loading || !report}
          onClick={() => downloadOrdersReportExcel(report, fromDate, toDate)}
        >
          Exportar Excel
        </button>
      </form>

      {error && <p className="orders-page-error">{error}</p>}

      {loading && !report && !error && (
        <p className="report-table-empty">Carregando relatório...</p>
      )}

      {summary && (
        <div className="reports-summary">
          <article className="reports-summary-card reports-summary-card--sold">
            <span className="reports-summary-label">Pedidos vendidos</span>
            <strong className="reports-summary-value">{summary.soldCount}</strong>
            <span className="reports-summary-money">{formatOrderMoney(summary.soldTotal)}</span>
          </article>
          <article className="reports-summary-card reports-summary-card--cancelled">
            <span className="reports-summary-label">Pedidos cancelados</span>
            <strong className="reports-summary-value">{summary.cancelledCount}</strong>
            <span className="reports-summary-money">
              {formatOrderMoney(summary.cancelledTotal)}
            </span>
          </article>
        </div>
      )}

      {report && (
        <>
          <OrdersReportTable
            title={`Todos os pedidos (${report.orders.length})`}
            orders={report.orders}
            emptyMessage="Nenhum pedido neste período."
          />
          <OrdersReportTable
            title={`Vendas — não cancelados (${report.soldOrders.length})`}
            orders={report.soldOrders}
            emptyMessage="Nenhuma venda neste período."
            variant="sold"
          />
          <OrdersReportTable
            title={`Cancelados (${report.cancelledOrders.length})`}
            orders={report.cancelledOrders}
            emptyMessage="Nenhum cancelamento neste período."
            variant="cancelled"
          />
        </>
      )}
    </section>
  )
}

function OrderDestinationEditor({ order, onSaved, onCancel }) {
  const initialDelivery = isDeliveryOrder(order.tableNumber, order.orderType)
  const [orderType, setOrderType] = useState(initialDelivery ? 'delivery' : 'table')
  const [tableNumber, setTableNumber] = useState(
    order.tableNumber ? String(order.tableNumber) : '',
  )
  const [customerName, setCustomerName] = useState(order.customerName || '')
  const [customerPhone, setCustomerPhone] = useState(
    order.customerPhone ? formatPhoneDisplay(order.customerPhone) : '',
  )
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress || '')
  const [deliveryReference, setDeliveryReference] = useState(order.deliveryReference || '')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        orderType,
        mesa: orderType === 'table' ? Number(tableNumber) : null,
        customerName: orderType === 'delivery' ? customerName : '',
        customerPhone: orderType === 'delivery' ? customerPhone : '',
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : '',
        deliveryReference: orderType === 'delivery' ? deliveryReference : '',
      }
      if (orderType === 'table' && (!payload.mesa || payload.mesa <= 0)) {
        setFormError('Informe o número da mesa.')
        return
      }
      if (orderType === 'delivery') {
        const check = validateDeliveryInfo({
          customerName,
          customerPhone,
          deliveryAddress,
          deliveryReference,
        })
        if (!check.ok) {
          setFormError(check.message)
          return
        }
        const data = check.data
        payload.customerName = data.customerName
        payload.customerPhone = data.customerPhone
        payload.deliveryAddress = data.deliveryAddress
        payload.deliveryReference = data.deliveryReference
      }
      const updated = await patchOrderDetails(API_BASE_URL, order.id, payload)
      onSaved(updated)
    } catch (saveError) {
      setFormError(formatApiError(saveError, 'Não foi possível salvar.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="order-destination-editor">
      <p className="order-destination-editor-title">Tipo do pedido</p>
      <div className="order-destination-type">
        <label>
          <input
            type="radio"
            name={`order-type-${order.id}`}
            checked={orderType === 'table'}
            onChange={() => setOrderType('table')}
          />
          Mesa
        </label>
        <label>
          <input
            type="radio"
            name={`order-type-${order.id}`}
            checked={orderType === 'delivery'}
            onChange={() => setOrderType('delivery')}
          />
          Delivery
        </label>
      </div>
      {orderType === 'table' ? (
        <label className="order-destination-field">
          Número da mesa
          <input
            type="number"
            min="1"
            value={tableNumber}
            onChange={(event) => setTableNumber(event.target.value)}
          />
        </label>
      ) : (
        <div className="order-destination-delivery-fields">
          <label className="order-destination-field">
            Nome
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </label>
          <label className="order-destination-field">
            WhatsApp
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </label>
          <label className="order-destination-field">
            Endereço
            <input
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </label>
          <label className="order-destination-field">
            Referência
            <input
              value={deliveryReference}
              onChange={(e) => setDeliveryReference(e.target.value)}
            />
          </label>
        </div>
      )}
      {formError && <p className="orders-page-error">{formError}</p>}
      <div className="order-destination-actions">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? 'Salvando...' : 'Salvar tipo do pedido'}
        </button>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)
  const [editingOrderId, setEditingOrderId] = useState(null)
  const [cancelModal, setCancelModal] = useState(null)
  const [successModal, setSuccessModal] = useState(null)

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/orders`)
      if (!response.ok) throw new Error('Falha ao carregar pedidos')
      const data = await response.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (loadError) {
      setError(formatApiError(loadError, 'Não foi possível carregar pedidos.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    const timer = window.setInterval(loadOrders, 15000)
    return () => window.clearInterval(timer)
  }, [])

  const fetchOrderItems = async (orderId) => {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/items`)
    if (!response.ok) throw new Error('Falha ao carregar itens do pedido')
    return response.json()
  }

  const updateOrderInList = (orderId, patch) => {
    setOrders((current) =>
      current.map((order) =>
        String(order.id) === String(orderId) ? { ...order, ...patch } : order,
      ),
    )
  }

  const handlePrint = async (order) => {
    if (isOrderCancelled(order.status)) return

    setActionId(order.id)
    setError('')
    try {
      const items = await fetchOrderItems(order.id)
      await printOrderDocument(order, items)
      if (!isOrderPrinted(order.status)) {
        const updated = await patchOrderStatus(API_BASE_URL, order.id, ORDER_STATUS.PRINTED)
        updateOrderInList(order.id, updated)
      }
    } catch (printError) {
      setError(formatApiError(printError, 'Não foi possível imprimir o pedido.'))
    } finally {
      setActionId(null)
    }
  }

  const handleMarkPrinted = async (order) => {
    setActionId(order.id)
    setError('')
    try {
      const updated = await patchOrderStatus(API_BASE_URL, order.id, ORDER_STATUS.PRINTED)
      updateOrderInList(order.id, updated)
    } catch (markError) {
      setError(formatApiError(markError, 'Não foi possível marcar como impresso.'))
    } finally {
      setActionId(null)
    }
  }

  const handleMarkPending = async (order) => {
    setActionId(order.id)
    setError('')
    try {
      const updated = await patchOrderStatus(API_BASE_URL, order.id, ORDER_STATUS.PENDING)
      updateOrderInList(order.id, updated)
    } catch (markError) {
      setError(formatApiError(markError, 'Não foi possível marcar como não impresso.'))
    } finally {
      setActionId(null)
    }
  }

  const openCancelModal = (order) => {
    setCancelModal({
      variant: 'confirm',
      title: 'Cancelar pedido?',
      description: `Pedido #${order.id} · ${formatOrderMoney(order.totalAmount)}. Ele sairá das vendas e aparecerá como cancelado nos relatórios.`,
      confirmLabel: 'Sim, cancelar',
      cancelLabel: 'Não',
      order,
    })
  }

  const confirmCancelOrder = async () => {
    const order = cancelModal?.order
    if (!order) return

    setCancelModal(null)
    setActionId(order.id)
    setError('')
    try {
      const updated = await patchOrderStatus(API_BASE_URL, order.id, ORDER_STATUS.CANCELLED)
      updateOrderInList(order.id, updated)
      setSuccessModal({
        variant: 'success',
        title: 'Pedido cancelado',
        description: `Pedido #${order.id} foi cancelado com sucesso.`,
      })
    } catch (cancelError) {
      setError(formatApiError(cancelError, 'Não foi possível cancelar o pedido.'))
    } finally {
      setActionId(null)
    }
  }

  const activeOrders = orders.filter((order) => !isOrderCancelled(order.status))
  const pendingCount = activeOrders.filter((order) => !isOrderPrinted(order.status)).length
  const printedCount = activeOrders.filter((order) => isOrderPrinted(order.status)).length
  const cancelledCount = orders.filter((order) => isOrderCancelled(order.status)).length

  const filteredOrders = orders.filter((order) => {
    if (filter === 'pending') return !isOrderCancelled(order.status) && !isOrderPrinted(order.status)
    if (filter === 'printed') return !isOrderCancelled(order.status) && isOrderPrinted(order.status)
    if (filter === 'cancelled') return isOrderCancelled(order.status)
    return true
  })

  return (
    <section className="orders-page">
      <header className="orders-page-header">
        <div>
          <h2>Pedidos</h2>
          <p>Impressora térmica (bobina 80 mm). Duas vias no mesmo cupom; ao imprimir, marca como impresso.</p>
        </div>
        <button type="button" className="admin-btn admin-btn-outline" onClick={loadOrders} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </header>

      {error && <p className="orders-page-error">{error}</p>}

      <div className="orders-filters" role="tablist" aria-label="Filtrar pedidos">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'pending'}
          className={`orders-filter-btn${filter === 'pending' ? ' is-active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Não impressos ({pendingCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'printed'}
          className={`orders-filter-btn${filter === 'printed' ? ' is-active' : ''}`}
          onClick={() => setFilter('printed')}
        >
          Impressos ({printedCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'cancelled'}
          className={`orders-filter-btn${filter === 'cancelled' ? ' is-active' : ''}`}
          onClick={() => setFilter('cancelled')}
        >
          Cancelados ({cancelledCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={`orders-filter-btn${filter === 'all' ? ' is-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todos ({orders.length})
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <p className="orders-page-empty">Carregando pedidos...</p>
      ) : filteredOrders.length === 0 ? (
        <p className="orders-page-empty">Nenhum pedido neste filtro.</p>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => {
            const printed = isOrderPrinted(order.status)
            const cancelled = isOrderCancelled(order.status)
            const busy = String(actionId) === String(order.id)

            return (
              <article
                key={order.id}
                className={`orders-card${printed ? ' orders-card--printed' : ''}${
                  cancelled ? ' orders-card--cancelled' : ''
                }`}
              >
                <div className="orders-card-head">
                  <div>
                    <strong className="orders-card-id">Pedido #{order.id}</strong>
                    <p className="orders-card-meta">
                      {formatOrderDateTime(order.createdAt)}
                      {' · '}
                      {isDeliveryOrder(order.tableNumber, order.orderType)
                        ? 'Delivery'
                        : order.tableNumber
                          ? `Mesa ${order.tableNumber}`
                          : 'Sem mesa'}
                    </p>
                  </div>
                  <span className={`orders-status-badge ${orderStatusBadgeClass(order.status)}`}>
                    {orderStatusLabel(order.status)}
                  </span>
                </div>

                <p className="orders-card-total">
                  {formatOrderMoney(order.totalAmount)}
                  {Number(order.deliveryFee) > 0 && (
                    <span className="orders-card-fee-note">
                      {' '}
                      (inclui taxa {formatOrderMoney(order.deliveryFee)})
                    </span>
                  )}
                </p>
                {editingOrderId === order.id ? (
                  <OrderDestinationEditor
                    order={order}
                    onSaved={(updated) => {
                      updateOrderInList(order.id, updated)
                      setEditingOrderId(null)
                    }}
                    onCancel={() => setEditingOrderId(null)}
                  />
                ) : null}
                {isDeliveryOrder(order.tableNumber, order.orderType) ? (
                  <div className="orders-card-delivery">
                    <p>
                      <strong>Cliente:</strong> {order.customerName}
                    </p>
                    <p>
                      <strong>WhatsApp:</strong> {formatPhoneDisplay(order.customerPhone)}
                    </p>
                    <p>
                      <strong>Endereço:</strong> {order.deliveryAddress}
                    </p>
                    <p>
                      <strong>Referência:</strong> {order.deliveryReference || '—'}
                    </p>
                  </div>
                ) : null}
                {order.observation ? (
                  <p className="orders-card-obs">
                    <strong>Obs.:</strong> {order.observation}
                  </p>
                ) : null}

                <div className="orders-card-actions">
                  {!cancelled ? (
                    <>
                      <button
                        type="button"
                        className="admin-btn admin-btn-outline"
                        disabled={busy}
                        onClick={() =>
                          setEditingOrderId((current) =>
                            current === order.id ? null : order.id,
                          )
                        }
                      >
                        {editingOrderId === order.id ? 'Fechar edição' : 'Mesa / Delivery'}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary"
                        disabled={busy}
                        onClick={() => handlePrint(order)}
                      >
                        {busy ? 'Aguarde...' : 'Imprimir cupom (2 vias)'}
                      </button>
                      {!printed ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn-outline"
                          disabled={busy}
                          onClick={() => handleMarkPrinted(order)}
                        >
                          Marcar impresso
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost"
                          disabled={busy}
                          onClick={() => handleMarkPending(order)}
                        >
                          Marcar não impresso
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        disabled={busy}
                        onClick={() => openCancelModal(order)}
                      >
                        Cancelar pedido
                      </button>
                    </>
                  ) : (
                    <p className="orders-card-cancelled-note">Pedido cancelado — não imprime.</p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <AdminFeedbackModal
        modal={
          cancelModal
            ? {
                ...cancelModal,
                onConfirm: confirmCancelOrder,
              }
            : null
        }
        onClose={() => setCancelModal(null)}
      />
      <AdminFeedbackModal modal={successModal} onClose={() => setSuccessModal(null)} />
    </section>
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
  deliveryPrice: '',
  sizePrices: emptySizePrices(),
  sizeDeliveryPrices: emptySizePrices(),
  image: '',
  isActive: true,
}

function buildItemFormFromMenuItem(item) {
  const hasPizzaSizes = itemHasSizes(item)
  return {
    category: item.category,
    subcategory: item.subcategory || '',
    name: item.name,
    description: item.description,
    price: hasPizzaSizes ? '' : formatPriceForInput(item.price),
    deliveryPrice: hasPizzaSizes ? '' : formatPriceForInput(item.deliveryPrice),
    sizePrices: buildSizePricesFromItem(item),
    sizeDeliveryPrices: buildSizePricesFromItem(item, { delivery: true }),
    image: item.image || '',
    isActive: item.isActive !== false,
  }
}

function AdminItemFormFields({
  form,
  categories,
  subcategoryOptions,
  onChange,
  onPriceChange,
  onSizePriceChange,
  onSizeDeliveryPriceChange,
  onDeliveryPriceChange,
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
        placeholder="Descrição"
        className="field-full"
      />
      <label className="file-input-label field-full">
        Foto do produto
        <input type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={onImageUpload} />
        <small className="field-hint">
          Qualquer tamanho: ao enviar ou salvar, a foto é recortada e redimensionada (800×450) para o
          cardápio.
        </small>
      </label>
      {showPizzaSizes ? (
        <div className="pizza-sizes-admin field-full">
          <span className="field-label">Preços por tamanho (pizzas)</span>
          <div className="pizza-sizes-admin-grid">
            {PIZZA_SIZE_TEMPLATES.map((template) => (
              <label key={template.id} className="pizza-size-admin-field">
                <span className="pizza-size-admin-label">
                  {template.label} ({template.pieces} pedaços)
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
                    aria-label={`Preço ${template.label}`}
                  />
                </div>
              </label>
            ))}
          </div>
          <div className="pizza-sizes-admin pizza-sizes-admin--delivery field-full">
            <span className="field-label">Preços delivery por tamanho (opcional)</span>
            <small className="field-hint field-hint-block">
              Vazio = mesmo preço do salão. Preencha só onde o delivery for diferente.
            </small>
            <div className="pizza-sizes-admin-grid">
              {PIZZA_SIZE_TEMPLATES.map((template) => (
                <label key={`delivery-${template.id}`} className="pizza-size-admin-field">
                  <span className="pizza-size-admin-label">{template.label} delivery</span>
                  <div className="price-input-wrap">
                    <span className="price-prefix" aria-hidden="true">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.sizeDeliveryPrices?.[template.id] || ''}
                      onChange={(event) =>
                        onSizeDeliveryPriceChange(template.id, event.target.value)
                      }
                      placeholder="Igual salão"
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-price-row field-full">
          <label className="price-field">
            <span className="field-label">Valor no salão / mesa</span>
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
          </label>
          <label className="price-field">
            <span className="field-label">Valor no delivery (opcional)</span>
            <div className="price-input-wrap">
              <span className="price-prefix" aria-hidden="true">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={form.deliveryPrice}
                onChange={onDeliveryPriceChange}
                placeholder="Igual salão"
                aria-label="Valor delivery"
              />
            </div>
            <small className="field-hint">Vazio = mesmo preço do salão.</small>
          </label>
        </div>
      )}
      <label className="admin-active-toggle field-full">
        <input type="checkbox" name="isActive" checked={form.isActive !== false} onChange={onChange} />
        <span>Item ativo no cardápio</span>
      </label>
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
  onSizeDeliveryPriceChange,
  onDeliveryPriceChange,
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
            aria-label="Fechar edição"
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
            onSizeDeliveryPriceChange={onSizeDeliveryPriceChange}
            onDeliveryPriceChange={onDeliveryPriceChange}
            onImageUpload={onImageUpload}
          />
          {form.image && (
            <div className="image-preview image-preview--modal field-full">
              <p>Pré-visualização (como no cardápio)</p>
              <div
                className="card-media menu-image-preview card-media--has-image"
                style={{ '--card-image': `url(${JSON.stringify(form.image)})` }}
                role="img"
                aria-label="Preview do item"
              />
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
          {modal.variant === 'confirm' || modal.variant === 'warning' ? (
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
              OK
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
  const [openSubcategoryKey, setOpenSubcategoryKey] = useState(null)

  const closeModal = () => setModal(null)
  const showModal = (config) => setModal(config)

  const toggleCategoryPanel = (categoryId) => {
    setOpenCategoryId((current) => (current === categoryId ? null : categoryId))
  }

  const subcategoryPanelKey = (categoryId, subId) => `${categoryId}:${subId}`

  const toggleSubcategoryPanel = (categoryId, subId) => {
    const key = subcategoryPanelKey(categoryId, subId)
    setOpenSubcategoryKey((current) => (current === key ? null : key))
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
      description: `Remover "${category.label}"?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        removeCategory(category.id)
        showModal({
          variant: 'success',
          title: 'Removida',
          description: 'Toque em Salvar categorias para confirmar.',
        })
      },
    })
  }

  const addCategory = () => {
    const label = newCategoryLabel.trim()
    if (!label) {
      showModal({
        variant: 'error',
        title: 'Nome obrigatório',
        description: 'Digite o nome da categoria.',
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
      title: 'Categoria adicionada',
      description: 'Salve as categorias para guardar no banco.',
    })

    window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-category-id="${id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const addSubcategory = (categoryId) => {
    const label = String(newSubLabelByCategory[categoryId] || '').trim()
    if (!label) {
      showModal({
        variant: 'error',
        title: 'Nome obrigatório',
        description: 'Digite o nome da subcategoria.',
      })
      return
    }

    const category = categories.find((item) => item.id === categoryId)
    if (!category) return

    let subId = slugify(label)
    if (category.subcategories.some((sub) => sub.id === subId)) {
      subId = `${subId}-${Date.now()}`
    }

    setCategories(
      categories.map((item) => {
        if (item.id !== categoryId) return item
        return {
          ...item,
          subcategories: [...item.subcategories, { id: subId, label }],
        }
      }),
    )
    setOpenCategoryId(categoryId)
    setOpenSubcategoryKey(subcategoryPanelKey(categoryId, subId))
    setNewSubLabelByCategory((current) => ({ ...current, [categoryId]: '' }))
    showModal({
      variant: 'success',
      title: 'Subcategoria adicionada',
      description: 'Salve as categorias para guardar no banco.',
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
      description: `Remover "${sub.label}"?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      onConfirm: () => {
        removeSubcategory(category.id, sub.id)
        showModal({
          variant: 'success',
          title: 'Removida',
          description: 'Toque em Salvar categorias para confirmar.',
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
            title: 'Salvo',
            description: 'Categorias gravadas no banco.',
          }
        : {
            variant: 'warning',
            title: 'API offline',
            description: 'Não foi possível salvar no banco. Tente de novo.',
          },
    )
  }

  return (
    <section className="categories-admin">
      <div className="categories-admin-intro">
        <h3>Categorias e subcategorias</h3>
        <p>
          Categoria principal (ex.: Pizzas) e subcategorias (ex.: Doces, Premium). Abra a
          categoria e clique em cada subcategoria para editar.
        </p>
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
                  <div className="subcategory-accordion">
                    {category.subcategories.map((sub) => {
                      const subKey = subcategoryPanelKey(category.id, sub.id)
                      const subOpen = openSubcategoryKey === subKey
                      return (
                        <article
                          key={sub.id}
                          className={`subcategory-accordion-item${subOpen ? ' is-open' : ''}`}
                        >
                          <button
                            type="button"
                            className="subcategory-accordion-trigger"
                            onClick={() => toggleSubcategoryPanel(category.id, sub.id)}
                            aria-expanded={subOpen}
                          >
                            <span className="subcategory-accordion-label">{sub.label}</span>
                            <span className="subcategory-accordion-chevron" aria-hidden="true" />
                          </button>
                          <div className="subcategory-accordion-panel">
                            <label className="admin-field">
                              <span className="admin-field-label">Nome da subcategoria</span>
                              <input
                                value={sub.label}
                                onChange={(event) =>
                                  updateSubcategoryLabel(category.id, sub.id, event.target.value)
                                }
                                aria-label={`Subcategoria ${sub.label}`}
                              />
                            </label>
                            <p className="category-admin-id">
                              ID: <code>{sub.id}</code>
                            </p>
                            <button
                              type="button"
                              className="admin-btn admin-btn-ghost"
                              onClick={() => confirmRemoveSubcategory(category, sub)}
                            >
                              Remover subcategoria
                            </button>
                          </div>
                        </article>
                      )
                    })}
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
  { id: 'novo', label: 'Novo item', hint: 'Cadastrar' },
  { id: 'itens', label: 'Itens', hint: 'Ver e editar' },
  { id: 'entrega', label: 'Entrega', hint: 'Taxa fixa' },
  { id: 'categorias', label: 'Categorias', hint: 'Grupos' },
  { id: 'qrcodes', label: 'QR Codes', hint: 'Mesas' },
]

function AdminDeliveryConfigBanner({ deliverySettings, onOpenSettings }) {
  const fee = Math.max(0, Number(deliverySettings.deliveryFee) || 0)
  const configured = fee > 0

  return (
    <div
      className={`admin-delivery-banner${configured ? ' admin-delivery-banner--ok' : ' admin-delivery-banner--warn'}`}
    >
      <div className="admin-delivery-banner-text">
        <strong>Taxa de entrega (delivery)</strong>
        {configured ? (
          <span>
            Valor fixo por pedido: <strong>R$ {fee.toFixed(2).replace('.', ',')}</strong>
          </span>
        ) : (
          <span>
            Defina a <strong>taxa de entrega</strong> na aba Entrega (pode ser R$ 0,00 se não
            cobrar).
          </span>
        )}
      </div>
      <button type="button" className="admin-btn admin-btn-outline" onClick={onOpenSettings}>
        {configured ? 'Editar taxa' : 'Configurar taxa'}
      </button>
    </div>
  )
}

function AdminDeliverySettings({ deliverySettings, saveDeliverySettings }) {
  const [form, setForm] = useState(() => ({
    deliveryFee: formatPriceForInput(deliverySettings.deliveryFee),
  }))
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    setForm({
      deliveryFee: formatPriceForInput(deliverySettings.deliveryFee),
    })
  }, [deliverySettings])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const fee = parsePriceInput(form.deliveryFee)
    if (Number.isNaN(fee) || fee < 0) {
      setModal({
        variant: 'error',
        title: 'Valor inválido',
        description: 'Informe um valor válido para a taxa de entrega.',
      })
      return
    }

    setSaving(true)
    try {
      await saveDeliverySettings({
        deliveryFee: fee,
        establishmentCep: '',
        establishmentStreet: '',
        establishmentNumber: '',
        establishmentNeighborhood: '',
        establishmentCity: '',
        establishmentState: '',
        deliveryPricePerKm: 0,
      })
      setModal({
        variant: 'success',
        title: 'Salvo',
        description: `Taxa de entrega: R$ ${fee.toFixed(2).replace('.', ',')}`,
      })
    } catch (error) {
      setModal({
        variant: 'error',
        title: 'Erro',
        description: formatApiError(error, 'Não foi possível salvar.'),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-delivery-settings">
      <header className="admin-panel-header">
        <h3>Taxa de entrega</h3>
        <p>
          Valor fixo somado a cada pedido delivery no cardápio.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="admin-delivery-settings-form">
        <div className="admin-delivery-card admin-delivery-card--km">
          <h4 className="admin-delivery-card-title">Taxa fixa por pedido</h4>
          <p className="admin-delivery-card-desc">
            Aparece no carrinho como &quot;Taxa de entrega&quot;. Use 0,00 se a entrega for grátis.
          </p>
          <label className="price-field field-full">
            <span className="field-label">Taxa de entrega (R$)</span>
            <div className="price-input-wrap">
              <span className="price-prefix" aria-hidden="true">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={form.deliveryFee}
                onChange={(event) =>
                  setForm((c) => ({ ...c, deliveryFee: applyPriceMask(event.target.value) }))
                }
                placeholder="Ex: 8,00"
              />
            </div>
          </label>
        </div>

        <button type="submit" className="admin-btn admin-btn-primary admin-delivery-save" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar taxa de entrega'}
        </button>
      </form>
      <AdminFeedbackModal modal={modal} onClose={() => setModal(null)} />
    </section>
  )
}

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
      <span className="admin-item-price-label">Preço</span>
      <span className="admin-item-price-value">{formatBRL(item.price)}</span>
    </p>
  )
}

function AdminImagePreviewModal({ imageSrc, title, onClose }) {
  useEffect(() => {
    if (!imageSrc) return undefined

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
  }, [imageSrc, onClose])

  if (!imageSrc) return null

  return createPortal(
    <div className="admin-image-modal-backdrop" onClick={onClose}>
      <div
        className="admin-image-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-image-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-image-modal-header">
          <h4 id="admin-image-modal-title">{title}</h4>
          <button
            type="button"
            className="admin-image-modal-close"
            onClick={onClose}
            aria-label="Fechar foto"
          >
            ×
          </button>
        </header>
        <div className="admin-image-modal-body">
          <img src={imageSrc} alt={`Foto de ${title}`} className="admin-image-modal-img" />
        </div>
        <footer className="admin-image-modal-footer">
          <button type="button" className="admin-btn admin-btn-primary" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}

function AdminMenuItemRow({ item, onEdit, onRemove, onToggleActive, isTogglingActive }) {
  const [showImagePreview, setShowImagePreview] = useState(false)
  const isActive = item.isActive !== false

  const handleToggleActive = async () => {
    if (isTogglingActive) return
    try {
      await onToggleActive(item.id, !isActive)
    } catch {
      /* feedback no AdminPage via modal se necessário */
    }
  }

  return (
    <article className={`admin-item${isActive ? '' : ' admin-item--inactive'}`}>
      <div className="admin-item-body">
        <strong className="admin-item-name">
          {item.name}
          {!isActive && <span className="admin-item-badge">Inativo</span>}
        </strong>
        <dl className="admin-item-meta">
          <div className="admin-item-meta-row">
            <dt>Imagem</dt>
            <dd>
              {hasMenuItemImage(item.image) ? (
                <button
                  type="button"
                  className="admin-view-photo-btn"
                  onClick={() => setShowImagePreview(true)}
                >
                  Ver foto
                </button>
              ) : (
                <span
                  className="admin-item-thumb admin-item-thumb--placeholder"
                  style={{ '--placeholder-logo': `url(${LOGO_URL})` }}
                  aria-hidden="true"
                />
              )}
            </dd>
          </div>
        </dl>
        <p className="admin-item-description">{item.description}</p>
        <AdminItemPricing item={item} />
      </div>
      <div className="admin-item-actions">
        <button
          type="button"
          className={`admin-btn admin-btn-outline${isActive ? '' : ' admin-btn-gold'}`}
          onClick={handleToggleActive}
          disabled={isTogglingActive}
        >
          {isTogglingActive ? '...' : isActive ? 'Desativar' : 'Ativar'}
        </button>
        <button type="button" className="edit-btn" onClick={() => onEdit(item)}>
          Editar
        </button>
        <button type="button" onClick={() => onRemove(item.id, item.name)}>
          Remover
        </button>
      </div>

      <AdminImagePreviewModal
        imageSrc={showImagePreview ? item.image : null}
        title={item.name}
        onClose={() => setShowImagePreview(false)}
      />
    </article>
  )
}

function itemsSubcategoryPanelKey(categoryId, sectionId) {
  return `${categoryId}:${sectionId || 'geral'}`
}

function AdminItemsCatalog({
  categories,
  groupedMenu,
  openItemsCategoryId,
  openItemsSubcategoryKey,
  onToggleSubcategory,
  onToggleCategory,
  onEdit,
  onRemove,
  onToggleActive,
  togglingItemId,
  itemSearchQuery,
  onItemSearchChange,
  itemStatusFilter,
  onItemStatusFilterChange,
  itemCategoryFilter,
  onItemCategoryFilterChange,
  itemSubcategoryFilter,
  onItemSubcategoryFilterChange,
  subcategoryFilterOptions,
  searchResultCount,
  hasActiveFilters,
  onClearFilters,
}) {
  const filtersActive = hasActiveFilters
  const visibleGroups = filtersActive
    ? groupedMenu.knownGroups.filter((group) => group.totalCount > 0)
    : groupedMenu.knownGroups
  const showOrphans = groupedMenu.orphans.length > 0 && (!filtersActive || groupedMenu.orphans.length > 0)

  return (
    <section className="admin-items-catalog admin-tab-panel-inner">
      <header className="admin-panel-header">
        <h3>Itens cadastrados</h3>
        <p>Busque e filtre por categoria, subcategoria ou status para achar itens no admin.</p>
      </header>

      <div className="admin-items-filters">
        <AdminSearchBar
          id="admin-items-search"
          value={itemSearchQuery}
          onChange={onItemSearchChange}
          placeholder="Buscar por nome, descrição..."
          resultCount={filtersActive ? searchResultCount : null}
        />
        <div className="admin-items-filter-row">
          <label className="admin-filter-field">
            <span className="admin-field-label">Categoria</span>
            <select
              value={itemCategoryFilter}
              onChange={(event) => onItemCategoryFilterChange(event.target.value)}
            >
              <option value="all">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-filter-field">
            <span className="admin-field-label">Subcategoria</span>
            <select
              value={itemSubcategoryFilter}
              onChange={(event) => onItemSubcategoryFilterChange(event.target.value)}
              disabled={subcategoryFilterOptions.length === 0}
            >
              <option value="all">Todas</option>
              {subcategoryFilterOptions.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-items-filter-toolbar">
          <div className="admin-items-filter-chips" role="group" aria-label="Filtrar por status">
            <button
              type="button"
              className={`admin-filter-chip${itemStatusFilter === 'all' ? ' is-active' : ''}`}
              onClick={() => onItemStatusFilterChange('all')}
            >
              Todos
            </button>
            <button
              type="button"
              className={`admin-filter-chip${itemStatusFilter === 'active' ? ' is-active' : ''}`}
              onClick={() => onItemStatusFilterChange('active')}
            >
              Ativos
            </button>
            <button
              type="button"
              className={`admin-filter-chip${itemStatusFilter === 'inactive' ? ' is-active' : ''}`}
              onClick={() => onItemStatusFilterChange('inactive')}
            >
              Inativos
            </button>
          </div>
          {hasActiveFilters && (
            <button type="button" className="admin-btn admin-btn-ghost" onClick={onClearFilters}>
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {filtersActive && searchResultCount === 0 && (
        <p className="admin-items-search-empty">Nenhum item encontrado com os filtros atuais.</p>
      )}

      <div className="category-accordion admin-menu-accordion">
        {visibleGroups.map(({ category, totalCount, sections }) => {
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
                  <div className="subcategory-accordion admin-items-sub-accordion">
                    {sections.map((section) => {
                      const itemRows = section.items.map((item) => (
                        <AdminMenuItemRow
                          key={item.id}
                          item={item}
                          onEdit={onEdit}
                          onRemove={onRemove}
                          onToggleActive={onToggleActive}
                          isTogglingActive={togglingItemId === item.id}
                        />
                      ))

                      if (!section.label) {
                        return (
                          <div key={section.id || 'geral'} className="admin-list admin-list--nested">
                            {itemRows}
                          </div>
                        )
                      }

                      const subKey = itemsSubcategoryPanelKey(category.id, section.id)
                      const subOpen = openItemsSubcategoryKey === subKey
                      const sectionCount = section.items.length
                      const sectionMeta =
                        sectionCount === 1 ? '1 item' : `${sectionCount} itens`

                      return (
                        <article
                          key={section.id || 'geral'}
                          className={`subcategory-accordion-item${subOpen ? ' is-open' : ''}`}
                        >
                          <button
                            type="button"
                            className="subcategory-accordion-trigger"
                            onClick={() => onToggleSubcategory(subKey)}
                            aria-expanded={subOpen}
                          >
                            <span className="subcategory-accordion-label">{section.label}</span>
                            <span className="subcategory-accordion-meta">{sectionMeta}</span>
                            <span className="subcategory-accordion-chevron" aria-hidden="true" />
                          </button>
                          <div className="subcategory-accordion-panel">
                            <div className="admin-list admin-list--nested">{itemRows}</div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </div>
            </article>
          )
        })}

        {showOrphans && (
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
        <p>Cadastre as mesas e abra a página de QR para imprimir.</p>
      </header>

      <form onSubmit={onAddTable} className="table-form">
        <input
          type="number"
          min="1"
          value={tableNumber}
          onChange={(event) => setTableNumber(event.target.value)}
          placeholder="Número da mesa"
        />
        <button type="submit" className="admin-btn admin-btn-primary">
          Adicionar mesa
        </button>
        <Link to="/qrcodes" className="admin-btn admin-btn-outline admin-link-btn">
          Abrir página de QR Codes
        </Link>
      </form>

      <div className="table-list">
        {tables.length === 0 ? (
          <p className="admin-items-empty">Nenhuma mesa cadastrada.</p>
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
  setMenuItemActive,
  menuSyncMessage,
  tables,
  saveTables,
  deliverySettings = DEFAULT_DELIVERY_SETTINGS,
  saveDeliverySettings,
}) {
  const [newItemForm, setNewItemForm] = useState(emptyItemForm)
  const [editForm, setEditForm] = useState(emptyItemForm)
  const [editingId, setEditingId] = useState(null)
  const [tableNumber, setTableNumber] = useState('')
  const [isSavingNewItem, setIsSavingNewItem] = useState(false)
  const [isSavingEditItem, setIsSavingEditItem] = useState(false)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [togglingItemId, setTogglingItemId] = useState(null)
  const [itemModal, setItemModal] = useState(null)
  const [openItemsCategoryId, setOpenItemsCategoryId] = useState(null)
  const [openItemsSubcategoryKey, setOpenItemsSubcategoryKey] = useState(null)
  const [adminTab, setAdminTab] = useState('itens')
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [itemStatusFilter, setItemStatusFilter] = useState('all')
  const [itemCategoryFilter, setItemCategoryFilter] = useState('all')
  const [itemSubcategoryFilter, setItemSubcategoryFilter] = useState('all')
  const closeItemModal = () => setItemModal(null)

  const subcategoryFilterOptions = useMemo(() => {
    if (itemCategoryFilter === 'all') return []
    const category = categories.find((entry) => entry.id === itemCategoryFilter)
    return category?.subcategories || []
  }, [categories, itemCategoryFilter])

  const hasActiveItemFilters =
    itemSearchQuery.trim().length > 0 ||
    itemStatusFilter !== 'all' ||
    itemCategoryFilter !== 'all' ||
    itemSubcategoryFilter !== 'all'

  const adminFilteredItems = useMemo(
    () =>
      filterMenuItemsForAdmin(menuItems, categories, {
        search: itemSearchQuery,
        status: itemStatusFilter,
        categoryId: itemCategoryFilter,
        subcategoryId: itemSubcategoryFilter,
      }),
    [menuItems, categories, itemSearchQuery, itemStatusFilter, itemCategoryFilter, itemSubcategoryFilter],
  )

  const groupedMenu = useMemo(
    () => groupMenuItemsForAdmin(adminFilteredItems, categories),
    [adminFilteredItems, categories],
  )

  const adminSearchResultCount = adminFilteredItems.length

  const clearItemFilters = () => {
    setItemSearchQuery('')
    setItemStatusFilter('all')
    setItemCategoryFilter('all')
    setItemSubcategoryFilter('all')
  }

  const handleItemCategoryFilterChange = (categoryId) => {
    setItemCategoryFilter(categoryId)
    setItemSubcategoryFilter('all')
    if (categoryId !== 'all') {
      setOpenItemsCategoryId(categoryId)
    }
  }

  useEffect(() => {
    if (!hasActiveItemFilters) return

    if (itemCategoryFilter !== 'all') {
      setOpenItemsCategoryId(itemCategoryFilter)
      return
    }

    const firstWithItems = groupedMenu.knownGroups.find((group) => group.totalCount > 0)
    if (firstWithItems) {
      setOpenItemsCategoryId(firstWithItems.category.id)
      return
    }
    if (groupedMenu.orphans.length > 0) {
      setOpenItemsCategoryId('__orphans__')
    }
  }, [
    hasActiveItemFilters,
    itemCategoryFilter,
    itemSearchQuery,
    groupedMenu,
  ])

  const newItemCategory = categories.find((category) => category.id === newItemForm.category)
  const newSubcategoryOptions = newItemCategory?.subcategories || []
  const editItemCategory = categories.find((category) => category.id === editForm.category)
  const editSubcategoryOptions = editItemCategory?.subcategories || []

  const makeFormChangeHandler = (setFormState) => (event) => {
    const { name, value, type, checked } = event.target
    if (type === 'checkbox') {
      setFormState((current) => ({ ...current, [name]: checked }))
      return
    }
    setFormState((current) => {
      if (name === 'category') {
        return {
          ...current,
          category: value,
          subcategory: '',
          price: isPizzaCategory(value) ? '' : current.price,
          sizePrices: emptySizePrices(),
          sizeDeliveryPrices: emptySizePrices(),
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

  const makeSizeDeliveryPriceChangeHandler = (setFormState) => (sizeId, value) => {
    const masked = applyPriceMask(value)
    setFormState((current) => ({
      ...current,
      sizeDeliveryPrices: { ...current.sizeDeliveryPrices, [sizeId]: masked },
    }))
  }

  const makeDeliveryPriceChangeHandler = (setFormState) => (event) => {
    const value = applyPriceMask(event.target.value)
    setFormState((current) => ({ ...current, deliveryPrice: value }))
  }

  const makeImageUploadHandler = (setFormState) => async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsProcessingImage(true)
    try {
      const image = await normalizeMenuImageFile(file)
      setFormState((current) => ({ ...current, image }))
    } catch (error) {
      setItemModal({
        variant: 'error',
        title: 'Foto do produto',
        description:
          error instanceof Error ? error.message : 'Não foi possível processar a imagem.',
      })
    } finally {
      setIsProcessingImage(false)
    }
  }

  const prepareItemPayloadForSave = async (payload) => {
    if (!payload.image) {
      return payload
    }
    try {
      const image = await normalizeMenuImageSource(payload.image)
      return { ...payload, image }
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Não foi possível ajustar a imagem. Tente outro arquivo JPG/PNG.',
      )
    }
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
      sizeDeliveryPrices: emptySizePrices(),
    })
  }

  const closeEditModal = () => {
    setEditingId(null)
    setEditForm({
      ...emptyItemForm,
      sizePrices: emptySizePrices(),
      sizeDeliveryPrices: emptySizePrices(),
    })
  }

  const startEdit = (item) => {
    setEditingId(normalizeItemId(item.id))
    setEditForm(buildItemFormFromMenuItem(item))
    setOpenItemsCategoryId(item.category)
    setAdminTab('itens')
  }

  const toggleItemsCategoryPanel = (categoryId) => {
    setOpenItemsCategoryId((current) => {
      const next = current === categoryId ? null : categoryId
      if (next !== categoryId) setOpenItemsSubcategoryKey(null)
      return next
    })
  }

  const toggleItemsSubcategoryPanel = (subKey) => {
    setOpenItemsSubcategoryKey((current) => (current === subKey ? null : subKey))
  }

  const validateItemForm = (form, subcategoryOptions) => {
    if (!form.name.trim()) {
      return {
        error: {
          variant: 'error',
          title: 'Nome obrigatório',
          description: 'Preencha o nome do item.',
        },
      }
    }
    if (!form.description.trim()) {
      return {
        error: {
          variant: 'error',
          title: 'Descrição obrigatória',
          description: 'Preencha a descrição do item.',
        },
      }
    }

    const basePayload = {
      category: form.category,
      subcategory: subcategoryOptions.length > 0 ? form.subcategory || '' : '',
      name: form.name.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
      isActive: form.isActive !== false,
    }

    if (isPizzaCategory(form.category)) {
      const sizes = buildSizesFromForm(
        form.category,
        0,
        form.sizePrices,
        form.sizeDeliveryPrices,
      )
      const invalid = sizes.find((size) => !size.price || size.price <= 0)
      if (invalid) {
        return {
          error: {
            variant: 'error',
            title: 'Preços incompletos',
            description: 'Preencha Broto, Média e Grande.',
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
          title: 'Preço inválido',
          description: 'Use um valor válido (ex.: 49,90).',
        },
      }
    }

    const parsedDelivery = parsePriceInput(form.deliveryPrice)
    const deliveryPrice =
      form.deliveryPrice.trim() === '' || Number.isNaN(parsedDelivery)
        ? null
        : parsedDelivery <= 0
          ? null
          : parsedDelivery

    return {
      payload: {
        ...basePayload,
        price: parsedPrice,
        deliveryPrice,
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
      const payload = await prepareItemPayloadForSave(validation.payload)
      await createMenuItem(payload)
      setItemModal({
        variant: 'success',
        title: 'Salvo',
        description: `"${payload.name}" foi cadastrado.`,
      })
      resetNewItemForm()
      setAdminTab('itens')
    } catch (error) {
      setItemModal({
        variant: 'error',
        title: 'Não salvou',
        description: formatApiError(error, 'Não foi possível salvar. Tente de novo.'),
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
      const payload = await prepareItemPayloadForSave(validation.payload)
      await updateMenuItem(editingId, payload)
      closeEditModal()
      setItemModal({
        variant: 'success',
        title: 'Atualizado',
        description: `"${payload.name}" foi salvo.`,
      })
    } catch (error) {
      setItemModal({
        variant: 'error',
        title: 'Não atualizou',
        description: formatApiError(error, 'Não foi possível atualizar. Tente de novo.'),
      })
    } finally {
      setIsSavingEditItem(false)
    }
  }

  const handleToggleItemActive = async (itemId, isActive) => {
    setTogglingItemId(itemId)
    try {
      await setMenuItemActive(itemId, isActive)
      setItemModal({
        variant: 'success',
        title: isActive ? 'Item ativado' : 'Item desativado',
        description: isActive
          ? 'O item voltou a aparecer no cardápio.'
          : 'O item não aparece mais no cardápio para os clientes.',
      })
    } catch (error) {
      setItemModal({
        variant: 'error',
        title: 'Erro',
        description: formatApiError(error, 'Não foi possível alterar o status.'),
      })
    } finally {
      setTogglingItemId(null)
    }
  }

  const removeItem = async (id, itemName) => {
    try {
      await deleteMenuItem(id)
      setItemModal({
        variant: 'success',
        title: 'Removido',
        description: `"${itemName}" saiu do cardápio.`,
      })
    } catch (error) {
      setItemModal({
        variant: 'error',
        title: 'Não removeu',
        description: formatApiError(error, 'Não foi possível remover. Tente de novo.'),
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
        <p>Use as abas: novo item, itens, entrega (taxa fixa), categorias ou QR Codes.</p>
        <AdminDeliveryConfigBanner
          deliverySettings={deliverySettings}
          onOpenSettings={() => setAdminTab('entrega')}
        />
        {isProcessingImage && (
          <p className="menu-sync-message" role="status">
            Ajustando imagem para o cardápio...
          </p>
        )}
        {menuSyncMessage && (
          <p
            className={`menu-sync-message${
              menuSyncMessage.includes('Sem conexão') ? ' menu-sync-message--warn' : ''
            }`}
          >
            {menuSyncMessage}
            {menuSyncMessage.includes('Sem conexão') && (
              <span className="menu-sync-message-hint">
                {' '}
                Rode a API: <code>cd backend && npm run dev</code> (ou na raiz:{' '}
                <code>npm run dev:all</code>).
              </span>
            )}
          </p>
        )}
      </header>

      <nav className="admin-tabs" role="tablist" aria-label="Seções do admin">
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
              <p>Preencha e salve para adicionar ao cardápio.</p>
            </header>
            <form onSubmit={handleNewItemSubmit} className="admin-form">
              <AdminItemFormFields
                form={newItemForm}
                categories={categories}
                subcategoryOptions={newSubcategoryOptions}
                onChange={makeFormChangeHandler(setNewItemForm)}
                onPriceChange={makePriceChangeHandler(setNewItemForm)}
                onSizePriceChange={makeSizePriceChangeHandler(setNewItemForm)}
                onSizeDeliveryPriceChange={makeSizeDeliveryPriceChangeHandler(setNewItemForm)}
                onDeliveryPriceChange={makeDeliveryPriceChangeHandler(setNewItemForm)}
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
                <p>Pré-visualização (como no cardápio)</p>
                <div
                  className="card-media menu-image-preview card-media--has-image"
                  style={{ '--card-image': `url(${JSON.stringify(newItemForm.image)})` }}
                  role="img"
                  aria-label="Preview do item"
                />
              </div>
            )}
          </div>
        )}

        {adminTab === 'itens' && (
          <div role="tabpanel" className="admin-tab-panel">
            <AdminItemsCatalog
              categories={categories}
              groupedMenu={groupedMenu}
              openItemsCategoryId={openItemsCategoryId}
              openItemsSubcategoryKey={openItemsSubcategoryKey}
              onToggleSubcategory={toggleItemsSubcategoryPanel}
              onToggleCategory={toggleItemsCategoryPanel}
              onEdit={startEdit}
              onRemove={removeItem}
              onToggleActive={handleToggleItemActive}
              togglingItemId={togglingItemId}
              itemSearchQuery={itemSearchQuery}
              onItemSearchChange={setItemSearchQuery}
              itemStatusFilter={itemStatusFilter}
              onItemStatusFilterChange={setItemStatusFilter}
              itemCategoryFilter={itemCategoryFilter}
              onItemCategoryFilterChange={handleItemCategoryFilterChange}
              itemSubcategoryFilter={itemSubcategoryFilter}
              onItemSubcategoryFilterChange={setItemSubcategoryFilter}
              subcategoryFilterOptions={subcategoryFilterOptions}
              searchResultCount={adminSearchResultCount}
              hasActiveFilters={hasActiveItemFilters}
              onClearFilters={clearItemFilters}
            />
          </div>
        )}

        {adminTab === 'entrega' && (
          <div role="tabpanel" className="admin-tab-panel">
            <AdminDeliverySettings
              deliverySettings={deliverySettings}
              saveDeliverySettings={saveDeliverySettings}
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
        onSizeDeliveryPriceChange={makeSizeDeliveryPriceChangeHandler(setEditForm)}
        onDeliveryPriceChange={makeDeliveryPriceChangeHandler(setEditForm)}
        onImageUpload={makeImageUploadHandler(setEditForm)}
      />

      <AdminFeedbackModal modal={itemModal} onClose={closeItemModal} />
    </section>
  )
}

export default App
