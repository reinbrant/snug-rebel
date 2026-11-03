import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import {
  Activity,
  Download,
  FolderKanban,
  Layers3,
  LogOut,
  MoonStar,
  Package,
  Plus,
  ShoppingCart,
  SunMedium,
  Tag,
  Users,
} from 'lucide-react'
import './App.css'
import { loginWithEmailPassword, loginWithOAuth } from './lib/auth'
import { API_BASE } from './lib/config'
import { Model3DList } from './components/Model3DList'
import { Model3DUpload } from './components/Model3DUpload'
import { uploadProductModel, type StagedModel } from './lib/models3d'
import type { OrderItem, ProductItem, SessionUser } from './types'

const STORAGE_KEY = 'snug-rebel-admin-session'
const THEME_KEY = 'snug-rebel-admin-theme'

const createVariantTemplate = (overrides: Partial<any> = {}) => ({
  id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  sku: `SR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  sizeId: 1,
  colorId: 1,
  stock: 12,
  priceOverride: 0,
  isActive: true,
  ...overrides,
})

const orderSeed: OrderItem[] = [
  {
    id: 'ORD-2401',
    customer: 'Maya Santos',
    total: 3240,
    status: 'Paid',
    date: '2026-10-28',
    channel: 'Web',
    shippingAddress: 'BGC, Taguig, Metro Manila',
    paymentMethod: 'Card',
    items: [
      { name: 'Oversized Tee', qty: 1, price: 1499 },
      { name: 'Utility Cargo', qty: 1, price: 1899 },
      { name: 'Shipping', qty: 1, price: 240 },
    ],
  },
  {
    id: 'ORD-2402',
    customer: 'Liam Cruz',
    total: 1890,
    status: 'Processing',
    date: '2026-10-28',
    channel: 'Marketplace',
    shippingAddress: 'Mandaluyong, Metro Manila',
    paymentMethod: 'GCash',
    items: [
      { name: 'Cotton Crew', qty: 2, price: 999 },
      { name: 'Shipping', qty: 1, price: 150 },
    ],
  },
]

const activityFilters = ['All', 'Delivered', 'Pending', 'Processing']

const defaultAnalytics = {
  minimumNumber: 0,
  averageNumber: 0,
  maximumNumber: 0,
  monthLabel: 'This month',
  days: [] as Array<{ date: string; value: number; orders: number; total: number; isCurrentDay: boolean }>,
}

function buildCalendarCells(days: typeof defaultAnalytics.days, monthDate = new Date()) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const leadingDays = firstOfMonth.getDay()
  const startDate = new Date(firstOfMonth)
  startDate.setDate(firstOfMonth.getDate() - leadingDays)

  const dayMap = new Map(days.map((day) => [day.date, day]))
  const cells: Array<{ date: string; dayNumber: number; inMonth: boolean; entry?: typeof defaultAnalytics.days[number]; isCurrentDay: boolean }> = []

  for (let index = 0; index < 35; index += 1) {
    const cellDate = new Date(startDate)
    cellDate.setDate(startDate.getDate() + index)
    const dateKey = cellDate.toISOString().slice(0, 10)
    const entry = dayMap.get(dateKey)
    cells.push({
      date: dateKey,
      dayNumber: cellDate.getDate(),
      inMonth: cellDate.getMonth() === monthDate.getMonth(),
      entry,
      isCurrentDay: dateKey === new Date().toISOString().slice(0, 10),
    })
  }

  return cells
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: Activity },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/categories', label: 'Categories', icon: Tag },
  { to: '/collections', label: 'Collections', icon: Layers3 },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/customers', label: 'Customers', icon: Users },
]

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem(THEME_KEY)
    return stored === 'dark' ? 'dark' : 'light'
  })
  const [session, setSession] = useState<SessionUser | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as SessionUser) : null
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [session])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage session={session} onLogin={setSession} theme={theme} onToggleTheme={() => setTheme((c) => (c === 'dark' ? 'light' : 'dark'))} />} />
        <Route element={<ProtectedLayout session={session} onLogout={() => setSession(null)} theme={theme} onToggleTheme={() => setTheme((c) => (c === 'dark' ? 'light' : 'dark'))} />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
        </Route>
        <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function ProtectedLayout({ session, onLogout, theme, onToggleTheme }: any) {
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">SR</div>
          <div>
            <p className="eyebrow">Operations</p>
            <h2>Snug Rebel</h2>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-card">
          <p className="eyebrow">Admin account</p>
          <strong>{session.user.firstName} {session.user.lastName}</strong>
          <small>{session.user.role}</small>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1>Admin control center</h1>
          </div>
          <div className="topbar-actions">
            <button type="button" className="icon-button" onClick={onToggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
            </button>
            <button type="button" className="logout-button" onClick={onLogout}>
              <LogOut size={16} /> Log out
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}

function LoginPage({ session, onLogin, theme, onToggleTheme }: any) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@snugrebel.com')
  const [password, setPassword] = useState('snUgr3bel@0902')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [navigate, session])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await loginWithEmailPassword(email, password)
      onLogin({
        user: {
          pkUserId: user.pkUserId,
          userEmail: user.userEmail,
          firstName: user.firstName || 'Admin',
          lastName: user.lastName || 'User',
          phoneNumber: user.phoneNumber,
          role: user.role || 'Customer',
          isActive: user.isActive ?? true,
        },
        provider: 'email',
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-header">
          <div className="brand-mark large">SR</div>
          <div><p className="eyebrow">Admin Access</p><h2>Snug Rebel</h2></div>
        </div>
        <div className="login-actions-top">
          <button type="button" className="icon-button" onClick={onToggleTheme}>
            {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
          </button>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <h1>Sign in</h1>
            <p>Use your staff credentials to manage catalog, orders, and reports.</p>
          </div>
          <label><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <div className="error-banner">{error}</div>}
          <button type="submit" className="primary-button" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
          <div className="divider"><span>or continue with</span></div>
          <div className="oauth-grid">
            <button type="button" className="secondary-button" onClick={() => loginWithOAuth('google').catch((e) => setError(e.message))}>Google</button>
            <button type="button" className="secondary-button" onClick={() => loginWithOAuth('github').catch((e) => setError(e.message))}>GitHub</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [analytics, setAnalytics] = useState(defaultAnalytics)
  const [notifications, setNotifications] = useState<any[]>([])
  
  const pendingShipments = notifications.filter((item) => item.status === 'Pending' || item.status === 'Processing').length
  const dashboardDateLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const calendarCells = buildCalendarCells(analytics.days)
  const maxHeatOrders = Math.max(1, ...analytics.days.map((entry) => Number(entry.orders ?? 0)))

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [analyticsResponse, activitiesResponse] = await Promise.all([
          fetch(`${API_BASE}/api/Dashboard/analytics`),
          fetch(`${API_BASE}/api/Dashboard/activities`),
        ])
        if (analyticsResponse.ok) {
          const analyticsPayload = await analyticsResponse.json()
          setAnalytics(current => ({
            ...current,
            minimumNumber: analyticsPayload.minimumNumber ?? current.minimumNumber,
            averageNumber: analyticsPayload.averageNumber ?? current.averageNumber,
            maximumNumber: analyticsPayload.maximumNumber ?? current.maximumNumber,
            monthLabel: analyticsPayload.monthLabel ?? current.monthLabel,
            days: analyticsPayload.days ?? current.days,
          }))
        }
        if (activitiesResponse.ok) {
          const payload = await activitiesResponse.json()
          const mapped = (payload.items ?? []).map((item: any) => ({
            id: item.orderId ?? item.orderNumber,
            category: item.category ?? 'General',
            weight: item.weight ?? '0 g',
            company: item.company ?? 'Unknown',
            time: item.arrivalTime ? new Date(item.arrivalTime).toLocaleDateString() : 'N/A',
            route: item.route ?? 'N/A',
            value: item.price ? `₱${Number(item.price).toLocaleString()}` : '₱0',
            status: item.status ?? 'Pending',
          }))
          setNotifications(mapped)
        }
      } catch (err) {}
    }
    loadDashboardData()
  }, [])

  const filteredShipments = activeFilter === 'All' ? notifications : notifications.filter((s) => s.status === activeFilter)

  return (
    <div className="page-stack">
      <section className="page-header dashboard-header">
        <div><p className="eyebrow">Overview</p><h2>Tracking Orders List</h2></div>
        <button type="button" className="primary-button small-button"><Download size={16} /> Export data</button>
      </section>

      <section className="database-panel panel-card">
        <div className="database-head">
          <div className="database-title">
            <div className="database-icon" aria-hidden="true">◌</div>
            <div><p className="eyebrow">Orders database</p><strong>Today - {dashboardDateLabel}</strong></div>
          </div>
          <div className="database-actions">
            <div className="notice-pill">You got {pendingShipments} pending shipments</div>
            <button type="button" className="secondary-button small-button">Download report</button>
            <button type="button" className="primary-button small-button">Create shipment</button>
          </div>
        </div>
      </section>

      <section className="analytics-grid single-analytic">
        <article className="panel-card analytic-panel">
          <div className="panel-head analytic-head">
            <div><p className="eyebrow">Analytics</p><h3>Analytic view</h3></div>
            <div className="segmented-control">
              <button type="button" className="segment active">Day</button>
              <button type="button" className="segment">Week</button>
              <button type="button" className="segment">Month</button>
            </div>
          </div>
          <div className="analytic-metrics">
            <div className="analytic-metric"><strong>{analytics.minimumNumber}</strong><span>minimum</span></div>
            <div className="analytic-metric"><strong>{analytics.averageNumber}</strong><span>average</span></div>
            <div className="analytic-metric"><strong>{analytics.maximumNumber}</strong><span>maximum</span></div>
          </div>
          <div className="heatmap-calendar-wrapper">
            <div className="heatmap-weekday-row">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day} className="heatmap-weekday">{day}</span>)}
            </div>
            <div className="heatmap-calendar-grid">
              {calendarCells.map((cell) => {
                const activeOrders = Number(cell.entry?.orders ?? 0)
                const intensity = activeOrders > 0 ? Math.min(1, 0.08 + Math.max(0, activeOrders - 1) / Math.max(1, maxHeatOrders) * 0.92) : 0
                return (
                  <div key={cell.date} className={`heatmap-calendar-cell ${!cell.inMonth ? 'blank' : ''} ${cell.isCurrentDay ? 'current' : ''}`}
                    style={{ background: activeOrders > 0 ? `rgba(45, 143, 91, ${intensity})` : 'rgba(255, 255, 255, 0.96)' }}>
                    <div className="calendar-cell-content">
                      <span className="calendar-day-number">{cell.dayNumber}</span>
                      {activeOrders > 0 && <><span className="calendar-badge">{activeOrders}</span><span className="calendar-total">{Math.round(Number(cell.entry?.total ?? 0))}</span></>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </article>
      </section>

      <section className="panel-card activity-panel">
        <div className="panel-head activity-head">
          <div><p className="eyebrow">Notifications</p><h3>Recent activities</h3></div>
          <div className="activity-filters">
            {activityFilters.map((f) => <button key={f} type="button" className={`activity-filter ${f === activeFilter ? 'active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>)}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order ID</th><th>Category</th><th>Weight</th><th>Company</th><th>Arrival</th><th>Route</th><th>Price</th><th>Status</th></tr></thead>
            <tbody>
              {filteredShipments.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td><td>{s.category}</td><td>{s.weight}</td><td>{s.company}</td><td>{s.time}</td><td>{s.route}</td><td>{s.value}</td>
                  <td><span className={`status-pill ${s.status === 'Delivered' ? 'success' : s.status === 'Processing' ? 'warning' : 'neutral'}`}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [colors, setColors] = useState<{ id: number; name: string }[]>([])
  const [sizes, setSizes] = useState<{ id: number; name: string }[]>([])

  const [form, setForm] = useState({
    displayId: '',
    slug: '',
    name: '',
    category: '',
    categoryId: '',
    description: '',
    material: '',
    price: '1499',
    isActive: true,
    variants: [createVariantTemplate()],
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [modelsVersion, setModelsVersion] = useState(0)
  const [pendingModel, setPendingModel] = useState<StagedModel | null>(null)
  const [modelNotice, setModelNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, catRes, colRes, sizeRes] = await Promise.all([
          fetch(`${API_BASE}/api/Product`),
          fetch(`${API_BASE}/api/Category`),
          fetch(`${API_BASE}/api/Color`),
          fetch(`${API_BASE}/api/Size`)
        ])
        
        let loadedCategories: any[] = []
        if (catRes.ok) {
          loadedCategories = (await catRes.json()).map((c: any) => ({ id: c.pkCategoryId, name: c.categoryName }))
          setCategories(loadedCategories)
        }
        
        let loadedColors: any[] = []
        if (colRes.ok) {
          loadedColors = (await colRes.json()).map((c: any) => ({ id: c.pkColorId, name: c.name }))
          setColors(loadedColors)
        }
        
        let loadedSizes: any[] = []
        if (sizeRes.ok) {
          loadedSizes = (await sizeRes.json()).map((s: any) => ({ id: s.pkSizeId, name: s.label }))
          setSizes(loadedSizes)
        }

        if (prodRes.ok) {
          const data = await prodRes.json()
          const mappedProducts = data.map((p: any) => ({
            id: p.pkProductId,
            displayId: p.displayId,
            slug: p.slug,
            name: p.productName,
            category: loadedCategories.find(c => c.id === p.fkCategoryId)?.name || 'Unknown', 
            categoryId: p.fkCategoryId,
            description: p.description || '',
            price: p.basePrice || 0,
            material: p.material || '',
            stock: p.productVariants ? p.productVariants.reduce((sum: number, v: any) => sum + (v.stockQuantity || 0), 0) : 0, 
            isActive: p.isActive,
            status: p.isActive ? 'Active' : 'Inactive',
            sku: p.displayId,
            variants: p.productVariants ? p.productVariants.map((v: any) => ({
              id: v.pkProductVariantId,
              sku: v.sku,
              sizeId: v.fkSizeId,
              colorId: v.fkColorId,
              size: loadedSizes.find(s => s.id === v.fkSizeId)?.name || 'Unknown',
              color: loadedColors.find(c => c.id === v.fkColorId)?.name || 'Unknown',
              stock: v.stockQuantity,
              priceOverride: v.priceOverride,
              isActive: v.isActive
            })) : []
          }))
          setProducts(mappedProducts)
        }
      } catch (err) {
        console.error('Failed to load products API dependencies:', err)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (!editingId && form.categoryId === '' && categories.length > 0) {
      setForm(f => ({ ...f, categoryId: categories[0].id, category: categories[0].name }))
    }
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => ({
        ...v,
        colorId: v.colorId === 1 && colors.length > 0 ? colors[0].id : v.colorId,
        sizeId: v.sizeId === 1 && sizes.length > 0 ? sizes[0].id : v.sizeId,
      }))
    }))
  }, [categories, colors, sizes])

  function handleChange(field: string, value: any) { setForm((c) => ({ ...c, [field]: value })) }
  function handleVariantChange(index: number, field: string, value: any) {
    setForm((c) => ({ ...c, variants: c.variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)) }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = {
      pkProductId: editingId || undefined,
      displayId: form.displayId,
      slug: form.slug,
      productName: form.name,
      fkCategoryId: form.categoryId,
      description: form.description,
      basePrice: Number(form.price) || 0,
      material: form.material,
      isActive: form.isActive,
    }

    try {
      if (editingId) {
        const response = await fetch(`${API_BASE}/api/Product/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (response.ok) {
          setProducts((c) => c.map((item) => (item.id === editingId ? { ...item, name: form.name, price: Number(form.price), isActive: form.isActive, categoryId: form.categoryId, category: categories.find(cat => cat.id === form.categoryId)?.name || 'Unknown' } : item)))
        }
      } else {
        const response = await fetch(`${API_BASE}/api/Product`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (response.ok) {
          const createdProduct = await response.json()
          const nextProduct: ProductItem = {
            id: createdProduct.pkProductId,
            displayId: createdProduct.displayId,
            slug: createdProduct.slug,
            name: createdProduct.productName,
            category: categories.find(c => c.id === createdProduct.fkCategoryId)?.name || form.category,
            categoryId: createdProduct.fkCategoryId,
            description: createdProduct.description,
            material: createdProduct.material,
            price: createdProduct.basePrice,
            stock: 0,
            isActive: createdProduct.isActive,
            status: createdProduct.isActive ? 'Active' : 'Inactive',
            sku: createdProduct.displayId,
            variants: [],
          }
          setProducts((c) => [nextProduct, ...c])
          
          if (pendingModel?.modelFile) {
            uploadProductModel(nextProduct.id, pendingModel).then(() => {
              setModelsVersion((v) => v + 1)
              setModelNotice({ tone: 'success', text: `3D model uploaded for ${nextProduct.name}.` })
            }).catch((e) => setModelNotice({ tone: 'error', text: `Upload failed: ${e.message}` }))
          }
        }
      }
    } catch (err) { console.error(err) }

    setPendingModel(null)
    setIsProductModalOpen(false)
  }

  function handleEdit(product: ProductItem) {
    setEditingId(product.id)
    setForm({
      displayId: product.displayId || product.sku,
      slug: product.slug,
      name: product.name,
      category: product.category,
      categoryId: product.categoryId || (categories.length > 0 ? categories[0].id : ''),
      description: product.description || '',
      material: product.material || '',
      price: String(product.price),
      isActive: product.isActive,
      variants: product.variants?.length
        ? product.variants.map((variant) => {
            // ProductVariantItem does not currently declare sizeId/colorId,
            // although the product API mapping supplies both at runtime.
            const variantWithDimensions = variant as typeof variant & {
              sizeId?: number
              colorId?: number
            }

            return {
              ...variant,
              sizeId: variantWithDimensions.sizeId ?? 1,
              colorId: variantWithDimensions.colorId ?? 1,
              priceOverride: variant.priceOverride ?? 0,
            }
          })
        : [createVariantTemplate()],
    })
    setIsProductModalOpen(true)
  }

  async function handleDeactivate(id: string) {
    try {
      const response = await fetch(`${API_BASE}/api/Product/${id}/deactivate`, { method: 'DELETE' })
      if (response.ok) {
        setProducts((c) => c.map((item) => (item.id === id ? { ...item, isActive: false, status: 'Inactive' } : item)))
        setSelectedProduct((c) => (c && c.id === id ? { ...c, isActive: false, status: 'Inactive' } : c))
      }
    } catch (err) {}
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div><p className="eyebrow">Catalog</p><h2>Products</h2></div>
        <div className="page-actions">
          <button type="button" className="primary-button small-button" onClick={() => { setEditingId(null); setPendingModel(null); setForm(f => ({ ...f, name: '', displayId: '', price: '1499' })); setIsProductModalOpen(true) }}><Plus size={16} /> Create product</button>
        </div>
      </section>

      {modelNotice && <div className={modelNotice.tone === 'error' ? 'error-banner' : 'notice-pill'} role="status">{modelNotice.text} <button className="link-button" onClick={() => setModelNotice(null)}>Dismiss</button></div>}

      <section className="panel-card">
        <div className="table-wrap compact">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="row-clickable" onClick={() => setSelectedProduct(product)}>
                  <td>{product.displayId}</td><td>{product.name}</td><td>{product.category}</td><td>{formatMoney(product.price)}</td><td>{product.stock}</td>
                  <td><span className={`status-pill ${product.status === 'Active' ? 'success' : 'neutral'}`}>{product.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedProduct && (
        <div className="order-modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="order-modal" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal-header">
              <div><p className="eyebrow">Product details</p><h3>{selectedProduct.name}</h3></div>
              <button type="button" className="icon-button" onClick={() => setSelectedProduct(null)}>×</button>
            </div>
            <div className="order-modal-grid">
              <div className="order-detail-block">
                <div className="detail-list">
                  <div><label>Category</label><span>{selectedProduct.category}</span></div>
                  <div><label>Material</label><span>{selectedProduct.material || 'N/A'}</span></div>
                  <div><label>Price</label><span>{formatMoney(selectedProduct.price)}</span></div>
                </div>
              </div>
            </div>
            <div className="order-items-header"><h4>Description</h4></div>
            <p className="empty-state-copy">{selectedProduct.description || 'No description yet.'}</p>
            
            <div className="order-items-header"><h4>3D models</h4></div>
            <Model3DUpload productId={selectedProduct.id} onUploadSuccess={() => setModelsVersion((v) => v + 1)} />
            <Model3DList productId={selectedProduct.id} refreshKey={modelsVersion} />

            <div className="order-items-header"><h4>Actions</h4></div>
            <div className="order-items-list">
              <div className="order-item-row">
                <div><strong>Product actions</strong></div>
                <div className="actions-cell">
                  <button className="primary-button small-button" onClick={() => { setSelectedProduct(null); handleEdit(selectedProduct) }}>Edit</button>
                  <button className="link-button danger" onClick={() => { setSelectedProduct(null); handleDeactivate(selectedProduct.id) }}>Deactivate</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="order-modal-backdrop" onClick={() => setIsProductModalOpen(false)}>
          <div className="order-modal product-modal" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal-header">
              <div><p className="eyebrow">Catalog</p><h3>{editingId ? 'Edit product' : 'Create product'}</h3></div>
              <button className="icon-button" onClick={() => setIsProductModalOpen(false)}>×</button>
            </div>
            <form className="product-form-grid" onSubmit={handleSubmit}>
              <label><span>Display ID</span><input value={form.displayId} onChange={(e) => handleChange('displayId', e.target.value)} /></label>
              <label><span>Slug</span><input value={form.slug} onChange={(e) => handleChange('slug', e.target.value)} /></label>
              <label className="full-span"><span>Product name</span><input required value={form.name} onChange={(e) => handleChange('name', e.target.value)} /></label>
              <label>
                <span>Category</span>
                <select value={form.categoryId} onChange={(e) => {
                  const val = e.target.value
                  handleChange('categoryId', val)
                  handleChange('category', categories.find(c => c.id === val)?.name || '')
                }}>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </label>
              <label><span>Material</span><input value={form.material} onChange={(e) => handleChange('material', e.target.value)} /></label>
              <label className="full-span"><span>Description</span><textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={3} /></label>
              <label><span>Base price</span><input type="number" required value={form.price} onChange={(e) => handleChange('price', e.target.value)} /></label>
              <label><span>Active</span><input type="checkbox" checked={form.isActive} onChange={(e) => handleChange('isActive', e.target.checked)} /></label>

              <div className="full-span inventory-editor">
                <div className="inventory-editor-header">
                  <h4>3D model</h4>
                </div>

                {editingId ? (
                  <>
                    <Model3DUpload
                      productId={editingId}
                      onUploadSuccess={() => setModelsVersion((version) => version + 1)}
                    />
                    <Model3DList productId={editingId} refreshKey={modelsVersion} />
                  </>
                ) : (
                  <>
                    <Model3DUpload stagedOnly onStagedChange={setPendingModel} />
                    <p className="m3d-muted">The model is uploaded right after the product is created.</p>
                  </>
                )}
              </div>

              <div className="full-span inventory-editor">
                <div className="inventory-editor-header"><h4>Variants (Draft support only)</h4></div>
                {form.variants.map((v, i) => (
                  <div key={v.id} className="variant-grid">
                    <label><span>SKU</span><input value={v.sku} onChange={(e) => handleVariantChange(i, 'sku', e.target.value)}/></label>
                    <label><span>Size</span><select value={v.sizeId} onChange={e => handleVariantChange(i, 'sizeId', Number(e.target.value))}>{sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                    <label><span>Color</span><select value={v.colorId} onChange={e => handleVariantChange(i, 'colorId', Number(e.target.value))}>{colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                    <label><span>Stock</span><input type="number" value={v.stock} onChange={e => handleVariantChange(i, 'stock', Number(e.target.value))}/></label>
                  </div>
                ))}
              </div>
              <div className="product-form-actions full-span">
                <button type="button" className="secondary-button" onClick={() => setIsProductModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-button">{editingId ? 'Save changes' : 'Create product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function CategoriesPage() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/api/Category`)
      .then(res => res.json())
      .then(data => setItems(data.map((c: any) => ({
        id: c.pkCategoryId, name: c.categoryName, slug: c.slug, status: c.isActive ? 'Active' : 'Hidden'
      }))))
      .catch(console.error)
  }, [])

  async function handleAdd() {
    const payload = { categoryName: `New category ${Date.now().toString().slice(-4)}`, isActive: true }
    try {
      const res = await fetch(`${API_BASE}/api/Category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const created = await res.json()
        setItems(c => [{ id: created.pkCategoryId, name: created.categoryName, slug: created.slug, status: created.isActive ? 'Active' : 'Hidden' }, ...c])
      }
    } catch (err) { console.error(err) }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div><p className="eyebrow">Catalog setup</p><h2>Categories</h2></div>
        <button type="button" className="primary-button small-button" onClick={handleAdd}><FolderKanban size={16} /> Add category</button>
      </section>
      <section className="panel-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Slug</th><th>Status</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}><td>{item.name}</td><td>{item.slug}</td><td><span className={`status-pill ${item.status === 'Active' ? 'success' : 'neutral'}`}>{item.status}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function CollectionsPage() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/api/Collection`)
      .then(res => res.json())
      .then(data => setItems(data.map((c: any) => ({
        id: c.pkCollectionId, name: c.collectionName, launch: c.launchDate ? new Date(c.launchDate).toLocaleDateString() : 'N/A', status: c.isActive ? 'Live' : 'Scheduled'
      }))))
      .catch(console.error)
  }, [])

  async function handleAdd() {
    const payload = { collectionName: `New Collection ${Date.now().toString().slice(-4)}`, isActive: false, launchDate: new Date().toISOString() }
    try {
      const res = await fetch(`${API_BASE}/api/Collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const c = await res.json()
        setItems(curr => [{ id: c.pkCollectionId, name: c.collectionName, launch: c.launchDate ? new Date(c.launchDate).toLocaleDateString() : 'N/A', status: c.isActive ? 'Live' : 'Scheduled' }, ...curr])
      }
    } catch (err) { console.error(err) }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div><p className="eyebrow">Marketing</p><h2>Collections</h2></div>
        <button type="button" className="primary-button small-button" onClick={handleAdd}><Layers3 size={16} /> Add collection</button>
      </section>
      <section className="panel-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Launch</th><th>Status</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}><td>{item.name}</td><td>{item.launch}</td><td><span className={`status-pill ${item.status === 'Live' ? 'success' : 'warning'}`}>{item.status}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>(orderSeed)
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/Order`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data)) {
           // Replace seeded data if an endpoint is ever successfully added
           setOrders(data.map(o => ({
             id: o.orderNumber, customer: o.fkUserId, total: o.totalAmount, status: 'Pending', date: new Date(o.placedAt).toLocaleDateString(), channel: 'Web'
           })))
        }
      })
      .catch(() => console.warn('OrderController does not expose GET /api/Order yet. Falling back to seed data.'))
  }, [])

  return (
    <div className="page-stack">
      <section className="page-header">
        <div><p className="eyebrow">Monitoring</p><h2>Orders</h2></div>
      </section>
      <section className="panel-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="row-clickable" onClick={() => setSelectedOrder(order)}>
                  <td>{order.id}</td><td>{order.customer}</td><td>{formatMoney(order.total)}</td>
                  <td><span className={`status-pill ${order.status === 'Paid' ? 'success' : 'warning'}`}>{order.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {selectedOrder && (
        <div className="order-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="order-modal" onClick={e => e.stopPropagation()}>
            <div className="order-modal-header">
              <div><p className="eyebrow">Order details</p><h3>{selectedOrder.id}</h3></div>
              <button className="icon-button" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            <div className="order-items-list">
              {(selectedOrder.items ?? []).map((item) => (
                <div key={item.name} className="order-item-row">
                  <div><strong>{item.name}</strong><span>Qty {item.qty}</span></div>
                  <span>{formatMoney(item.price)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomersPage() {
  const customers = [
    { id: 'USR-1001', name: 'Maya Santos', email: 'maya@demo.com', orders: 16, lifetime: 28360 },
  ]
  return (
    <div className="page-stack">
      <section className="page-header"><div><p className="eyebrow">People</p><h2>Customers</h2></div></section>
      <section className="panel-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Orders</th><th>Lifetime</th></tr></thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}><td>{customer.id}</td><td>{customer.name}</td><td>{customer.email}</td><td>{customer.orders}</td><td>{formatMoney(customer.lifetime)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default App