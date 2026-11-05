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
import { loginWithEmailPassword } from './lib/auth'
import { API_BASE, apiFetch, requestJson, readErrorMessage, resolveAssetUrl } from './lib/config'
import { ProductImagesEditor } from './components/ProductImagesEditor'
import { Model3DList } from './components/Model3DList'
import { Model3DUpload } from './components/Model3DUpload'
import { uploadProductModel, type StagedModel } from './lib/models3d'
import type { OrderItem, ProductItem, SessionUser } from './types'

const STORAGE_KEY = 'snug-rebel-admin-session'
const THEME_KEY = 'snug-rebel-admin-theme'

const createVariantTemplate = (overrides: Record<string, any> = {}) => ({
  id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  sku: `SR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  sizeId: null as number | null,
  colorId: null as number | null,
  stock: 12,
  priceOverride: null as number | null,
  isActive: true,
  ...overrides,
})

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

  const cellCount = Math.ceil((leadingDays + new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()) / 7) * 7
  for (let index = 0; index < cellCount; index += 1) {
    const cellDate = new Date(startDate)
    cellDate.setDate(startDate.getDate() + index)
    const dateKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`
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
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/customers', label: 'Customers', icon: Users },
]

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map(row => row.map(value => {
    const text = String(value)
    const safe = /^[=+@-]/.test(text) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
}

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
  const [checkingSession, setCheckingSession] = useState(true)
  const [session, setSession] = useState<SessionUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? (JSON.parse(saved) as SessionUser) : null
    } catch { return null }
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

  useEffect(() => {
    requestJson('/api/Auth/session').then(user => {
      setSession(['Admin', 'Staff'].includes(user.role) && user.isActive ? { user, provider: 'email' } : null)
    }).catch(() => setSession(null)).finally(() => setCheckingSession(false))
  }, [])

  async function logout() {
    try { await requestJson('/api/Auth/logout', { method: 'POST' }); setSession(null) }
    catch (e) { window.alert(e instanceof Error ? e.message : 'Unable to log out.') }
  }

  if (checkingSession) return <p role="status">Checking session…</p>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage session={session} onLogin={setSession} theme={theme} onToggleTheme={() => setTheme((c) => (c === 'dark' ? 'light' : 'dark'))} />} />
        <Route element={<ProtectedLayout session={session} onLogout={logout} theme={theme} onToggleTheme={() => setTheme((c) => (c === 'dark' ? 'light' : 'dark'))} />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
        </Route>
        <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function ProtectedLayout({ session, onLogout, theme, onToggleTheme }: any) {
  if (!session || !['Admin', 'Staff'].includes(session.user.role)) return <Navigate to="/login" replace />

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      if (!['Admin', 'Staff'].includes(user.role) || !user.isActive) {
        await requestJson('/api/Auth/logout', { method: 'POST' })
        throw new Error('An active admin or staff account is required.')
      }
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
        </form>
      </div>
    </div>
  )
}

function DashboardPage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState('Day')
  const [activeFilter, setActiveFilter] = useState('All')
  const [analytics, setAnalytics] = useState(defaultAnalytics)
  const [notifications, setNotifications] = useState<any[]>([])
  
  const pendingShipments = notifications.filter((item) => item.status === 'Pending' || item.status === 'Processing').length
  const dashboardDateLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  const calendarCells = buildCalendarCells(analytics.days)
  const [error, setError] = useState('')
  const maxHeatOrders = Math.max(1, ...analytics.days.map((entry) => Number(entry.orders ?? 0)))

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [analyticsResponse, activitiesResponse] = await Promise.all([
          apiFetch(`${API_BASE}/api/Dashboard/analytics`),
          apiFetch(`${API_BASE}/api/Dashboard/activities`),
        ])
        if (!analyticsResponse.ok) throw new Error(await readErrorMessage(analyticsResponse, 'Unable to load analytics.'))
        if (!activitiesResponse.ok) throw new Error(await readErrorMessage(activitiesResponse, 'Unable to load activities.'))
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
      } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load dashboard.') }
    }
    loadDashboardData()
  }, [])

  const currentMonth = analytics.days.filter(day => day.date.slice(0, 7) === calendarCells.find(cell => cell.inMonth)?.date.slice(0, 7))
  const buckets = new Map<string, number>()
  currentMonth.forEach(day => {
    const key = period === 'Day' ? day.date : period === 'Month' ? day.date.slice(0, 7) : String(Math.floor((Number(day.date.slice(8)) - 1 + new Date(`${day.date.slice(0, 7)}-01T00:00:00`).getDay()) / 7))
    buckets.set(key, (buckets.get(key) || 0) + day.orders)
  })
  const values = [...buckets.values()]
  const minimum = values.length ? Math.min(...values) : 0
  const maximum = values.length ? Math.max(...values) : 0
  const average = values.length ? Math.round(values.reduce((sum, n) => sum + n, 0) / values.length) : 0
  const filteredShipments = activeFilter === 'All' ? notifications : notifications.filter((s) => s.status === activeFilter)

  return (
    <div className="page-stack">
      {error && <p className="error-banner" role="alert">{error}</p>}
      <section className="page-header dashboard-header">
        <div><p className="eyebrow">Overview</p><h2>Tracking Orders List</h2></div>
        <button type="button" className="primary-button small-button" onClick={() => downloadCsv('snug-rebel-analytics.csv', [
          ['Date', 'Orders', 'Total'], ...analytics.days.map(day => [day.date, day.orders, day.total]),
        ])}><Download size={16} /> Export data</button>
      </section>

      <section className="database-panel panel-card">
        <div className="database-head">
          <div className="database-title">
            <div className="database-icon" aria-hidden="true">◌</div>
            <div><p className="eyebrow">Orders database</p><strong>Today - {dashboardDateLabel}</strong></div>
          </div>
          <div className="database-actions">
            <div className="notice-pill">You got {pendingShipments} pending shipments</div>
            <button type="button" className="secondary-button small-button" onClick={() => downloadCsv('snug-rebel-shipments.csv', [
              ['Order', 'Category', 'Company', 'Route', 'Value', 'Status'],
              ...filteredShipments.map(item => [item.id, item.category, item.company, item.route, item.value, item.status]),
            ])}>Download report</button>
            <button type="button" className="primary-button small-button" onClick={() => navigate('/orders')}>Create shipment</button>
          </div>
        </div>
      </section>

      <section className="analytics-grid single-analytic">
        <article className="panel-card analytic-panel">
          <div className="panel-head analytic-head">
            <div><p className="eyebrow">Analytics</p><h3>Analytic view</h3></div>
            <div className="segmented-control">
              {['Day', 'Week', 'Month'].map(value => <button key={value} type="button" aria-pressed={period === value} className={`segment ${period === value ? 'active' : ''}`} onClick={() => setPeriod(value)}>{value}</button>)}
            </div>
          </div>
          <div className="analytic-metrics">
            <div className="analytic-metric"><strong>{minimum}</strong><span>minimum</span></div>
            <div className="analytic-metric"><strong>{average}</strong><span>average</span></div>
            <div className="analytic-metric"><strong>{maximum}</strong><span>maximum</span></div>
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
  const emptyForm = () => ({
    displayId: '', slug: '', name: '', category: '', categoryId: categories[0]?.id || '',
    description: '', material: '', price: '1499', isActive: true, hasSizes: false, hasColors: false,
    images: [] as Array<{ url: string; altText?: string }>, variants: [createVariantTemplate()],
  })
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [modelsVersion, setModelsVersion] = useState(0)
  const [pendingModel, setPendingModel] = useState<StagedModel | null>(null)
  const [modelNotice, setModelNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [loadVersion, setLoadVersion] = useState(0)

  function mapProduct(p: any, cats: typeof categories, allSizes: typeof sizes, allColors: typeof colors): ProductItem {
    return {
      id: p.pkProductId, displayId: p.displayId, slug: p.slug, name: p.productName,
      category: cats.find(c => c.id === p.fkCategoryId)?.name || 'Unknown', categoryId: p.fkCategoryId,
      description: p.description || '', price: p.basePrice, material: p.material || '',
      stock: (p.productVariants ?? []).reduce((sum: number, v: any) => sum + v.stockQuantity, 0),
      isActive: p.isActive, status: p.isActive ? 'Active' : 'Inactive', sku: p.displayId,
      hasSizes: p.hasSizes, hasColors: p.hasColors,
      images: (p.productImages ?? []).map((i: any) => ({ url: i.url, altText: i.altText || '' })),
      variants: (p.productVariants ?? []).map((v: any) => ({
        id: v.pkProductVariantId, sku: v.sku, sizeId: v.fkSizeId, colorId: v.fkColorId,
        size: allSizes.find(s => s.id === v.fkSizeId)?.name || 'One size',
        color: allColors.find(c => c.id === v.fkColorId)?.name || 'Standard',
        stock: v.stockQuantity, priceOverride: v.priceOverride, isActive: v.isActive,
      })),
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all(['/Product', '/Category', '/Color', '/Size'].map(path => requestJson(`/api${path}`)))
      .then(([data, cats, cols, szs]) => {
        if (cancelled) return
        const loadedCategories = cats.map((c: any) => ({ id: c.pkCategoryId, name: c.categoryName }))
        const loadedColors = cols.filter((c: any) => c.name !== 'Standard').map((c: any) => ({ id: c.pkColorId, name: c.name }))
        const loadedSizes = szs.filter((s: any) => s.label !== 'One size').map((s: any) => ({ id: s.pkSizeId, name: s.label }))
        setCategories(loadedCategories); setColors(loadedColors); setSizes(loadedSizes)
        setProducts(data.map((p: any) => mapProduct(p, loadedCategories, loadedSizes, loadedColors)))
      }).catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [loadVersion])

  function handleChange(field: string, value: any) { setForm(c => ({ ...c, [field]: value })) }
  function handleVariantChange(index: number, field: string, value: any) {
    setForm(c => ({ ...c, variants: c.variants.map((v, i) => i === index ? { ...v, [field]: value } : v) }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSaving(true)
    try {
      const saved = await requestJson(`/api/Product${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayId: form.displayId || null, slug: form.slug, productName: form.name, fkCategoryId: form.categoryId,
          description: form.description, basePrice: Number(form.price), material: form.material, isActive: form.isActive,
          hasSizes: form.hasSizes, hasColors: form.hasColors, images: form.images,
          variants: form.variants.map(v => ({
            id: v.id.startsWith('var-') ? null : v.id, sku: v.sku,
            sizeId: form.hasSizes ? v.sizeId : null, colorId: form.hasColors ? v.colorId : null,
            stock: v.stock, priceOverride: v.priceOverride, isActive: v.isActive,
          })),
        }),
      })
      const product = mapProduct(saved, categories, sizes, colors)
      setProducts(current => [product, ...current.filter(p => p.id !== product.id)])
      // A failed model upload can be retried without creating a second product.
      setEditingId(product.id)
      setForm(current => ({ ...current, variants: product.variants.map(v => createVariantTemplate(v)) }))
      if (pendingModel?.modelFile) {
        await uploadProductModel(product.id, pendingModel)
        setPendingModel(null); setModelsVersion(v => v + 1); setLoadVersion(v => v + 1)
      }
      setModelNotice({ tone: 'success', text: `${product.name} saved.` })
      setIsProductModalOpen(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save product.') }
    finally { setSaving(false) }
  }

  function handleEdit(product: ProductItem) {
    setError(''); setPendingModel(null); setEditingId(product.id)
    setForm({
      displayId: product.displayId || '', slug: product.slug, name: product.name, category: product.category,
      categoryId: product.categoryId || '', description: product.description || '', material: product.material || '',
      price: String(product.price), isActive: product.isActive, hasSizes: product.hasSizes, hasColors: product.hasColors,
      images: product.images, variants: product.variants.length ? product.variants.map(v => createVariantTemplate(v)) : [createVariantTemplate()],
    })
    setIsProductModalOpen(true)
  }

  async function handleDeactivate(id: string) {
    try {
      await requestJson(`/api/Product/${id}/deactivate`, { method: 'DELETE' })
      setProducts(c => c.map(p => p.id === id ? { ...p, isActive: false, status: 'Inactive' } : p))
      setSelectedProduct(c => c?.id === id ? { ...c, isActive: false, status: 'Inactive' } : c)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to deactivate product.') }
  }

  return (
    <div className="page-stack">
      {!isProductModalOpen && error && <p className="error-banner" role="alert">{error}</p>}
      <section className="page-header">
        <div><p className="eyebrow">Catalog</p><h2>Products</h2></div>
        <div className="page-actions">
          <button type="button" className="primary-button small-button" onClick={() => { setEditingId(null); setPendingModel(null); setError(''); setForm(emptyForm()); setIsProductModalOpen(true) }}><Plus size={16} /> Create product</button>
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
            
            <div className="product-images">{selectedProduct.images.map(image => <img className="product-detail-image" key={image.url} src={resolveAssetUrl(image.url)} alt={image.altText || selectedProduct.name} />)}</div>
            <div className="order-items-header"><h4>3D models</h4></div>
            <Model3DUpload productId={selectedProduct.id} onUploadSuccess={model => {
              setModelsVersion(v => v + 1); setLoadVersion(v => v + 1)
              if (model.previewImageUrl) setSelectedProduct(current => current ? { ...current, images: [...current.images, { url: model.previewImageUrl!, altText: model.modelName }] } : current)
            }} />
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
        <div className="order-modal-backdrop" onClick={() => { if (!saving && !uploadingImage) setIsProductModalOpen(false) }}>
          <div className="order-modal product-modal" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal-header">
              <div><p className="eyebrow">Catalog</p><h3>{editingId ? 'Edit product' : 'Create product'}</h3></div>
              <button className="icon-button" disabled={saving || uploadingImage} onClick={() => setIsProductModalOpen(false)}>×</button>
            </div>
            <form className="product-form-grid" onSubmit={handleSubmit}>
              {error && <div className="error-banner full-span" role="alert">{error}</div>}
              <label><span>Display ID</span><input value={form.displayId} onChange={(e) => handleChange('displayId', e.target.value)} /></label>
              <label><span>Slug</span><input value={form.slug} onChange={(e) => handleChange('slug', e.target.value)} /></label>
              <label className="full-span"><span>Product name</span><input required value={form.name} onChange={(e) => handleChange('name', e.target.value)} /></label>
              <label>
                <span>Category</span>
                <select aria-label="Category" required value={form.categoryId} onChange={(e) => {
                  const val = e.target.value
                  handleChange('categoryId', val)
                  handleChange('category', categories.find(c => c.id === val)?.name || '')
                }}>
                  <option value="">Choose category</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </label>
              <label><span>Material</span><input value={form.material} onChange={(e) => handleChange('material', e.target.value)} /></label>
              <label className="full-span"><span>Description</span><textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={3} /></label>
              <label><span>Base price</span><input type="number" min="0" step="0.01" required value={form.price} onChange={(e) => handleChange('price', e.target.value)} /></label>
              <label><span>Active</span><input type="checkbox" checked={form.isActive} onChange={(e) => handleChange('isActive', e.target.checked)} /></label>

              <ProductImagesEditor images={form.images} onChange={images => handleChange('images', images)} onBusyChange={setUploadingImage} />
              <div className="full-span inventory-editor">
                <div className="inventory-editor-header">
                  <h4>3D model</h4>
                </div>

                {editingId ? (
                  <>
                    <Model3DUpload
                      productId={editingId}
                      onUploadSuccess={model => {
                        setModelsVersion(version => version + 1)
                        if (model.previewImageUrl) setForm(current => ({ ...current, images: [...current.images, { url: model.previewImageUrl!, altText: model.modelName }] }))
                        setLoadVersion(version => version + 1)
                      }}
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
                <div className="inventory-editor-header"><h4>Inventory</h4></div>
                <label><span>Has sizes</span><input type="checkbox" checked={form.hasSizes} onChange={e => handleChange('hasSizes', e.target.checked)} /></label>
                <label><span>Has colors</span><input type="checkbox" checked={form.hasColors} onChange={e => handleChange('hasColors', e.target.checked)} /></label>
                {form.variants.map((v, i) => (
                  <div key={v.id} className="variant-grid">
                    <label><span>SKU</span><input required maxLength={64} value={v.sku} onChange={e => handleVariantChange(i, 'sku', e.target.value)} /></label>
                    {form.hasSizes && <label><span>Size</span><select aria-label="Size" required value={v.sizeId ?? ''} onChange={e => handleVariantChange(i, 'sizeId', Number(e.target.value))}><option value="">Choose size</option>{sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
                    {form.hasColors && <label><span>Color</span><select aria-label="Color" required value={v.colorId ?? ''} onChange={e => handleVariantChange(i, 'colorId', Number(e.target.value))}><option value="">Choose color</option>{colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
                    <label><span>Stock</span><input type="number" min="0" step="1" required value={v.stock} onChange={e => handleVariantChange(i, 'stock', Number(e.target.value))} /></label>
                    <label><span>Price override (optional)</span><input type="number" min="0" step="0.01" value={v.priceOverride ?? ''} onChange={e => handleVariantChange(i, 'priceOverride', e.target.value === '' ? null : Number(e.target.value))} /></label>
                    {form.variants.length > 1 && <button type="button" className="link-button danger" onClick={() => handleChange('variants', form.variants.filter((_, index) => index !== i))}>Remove variant</button>}
                  </div>
                ))}
                {(form.hasSizes || form.hasColors) && <button type="button" className="secondary-button" onClick={() => handleChange('variants', [...form.variants, createVariantTemplate()])}>Add variant</button>}
              </div>
              <div className="product-form-actions full-span">
                <button type="button" className="secondary-button" disabled={saving || uploadingImage} onClick={() => setIsProductModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving || uploadingImage}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create product'}</button>
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
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const blank = { name: '', slug: '', description: '', isActive: true }
  const [form, setForm] = useState(blank)

  useEffect(() => {
    requestJson('/api/Category').then(setItems).catch(e => setError(e.message))
  }, [])

  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(''); setSaving(true)
    try {
      const item = await requestJson(`/api/Category${editing ? `/${editing}` : ''}`, {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryName: form.name, slug: form.slug, description: form.description,
          isActive: form.isActive }),
      })
      setItems(current => [item, ...current.filter(i => i.pkCategoryId !== item.pkCategoryId)]); setOpen(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.') }
    finally { setSaving(false) }
  }

  async function remove(item: any) {
    if (!window.confirm(`Delete ${item.categoryName}?`)) return
    try {
      await requestJson(`/api/Category/${item.pkCategoryId}`, { method: 'DELETE' })
      setItems(current => current.filter(i => i.pkCategoryId !== item.pkCategoryId))
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete.') }
  }

  return <div className="page-stack">
    <section className="page-header"><div><p className="eyebrow">Catalog setup</p><h2>Categories</h2></div>
      <button className="primary-button small-button" onClick={() => { setForm(blank); setEditing(null); setError(''); setOpen(true) }}>Add category</button>
    </section>
    {error && <p className="error-banner" role="alert">{error}</p>}
    {open && <form className="panel-card product-form-grid" onSubmit={save}>
      <label><span>Name</span><input required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label><span>Slug (optional)</span><input maxLength={120} value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></label>
      <label><span>Description</span><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <label><span>Active</span><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /></label>
      <div className="page-actions"><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>}
    <section className="panel-card"><div className="table-wrap"><table>
      <thead><tr><th>Name</th><th>Slug</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{items.map(item => <tr key={item.pkCategoryId}>
        <td>{item.categoryName}</td><td>{item.slug}</td>
        <td>{item.isActive ? 'Active' : 'Hidden'}</td>
        <td><button className="link-button" onClick={() => {
          setEditing(item.pkCategoryId); setForm({ name: item.categoryName, slug: item.slug, description: item.description || '', isActive: item.isActive }); setOpen(true); setError('')
        }}>Edit</button><button className="link-button danger" onClick={() => void remove(item)}>Delete</button></td>
      </tr>)}</tbody>
    </table>{items.length === 0 && <p>No categories found.</p>}</div></section>
  </div>
}

function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [shipment, setShipment] = useState({ courier: '', trackingNumber: '' })
  const [savingShipment, setSavingShipment] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    requestJson('/api/Order').then(data => setOrders(data.map((o: any) => ({
      orderId: o.pkOrderId, id: o.orderNumber, customer: o.contactEmail || o.fkUserId || 'Guest', total: o.totalAmount,
      status: o.status, courier: o.courier || 'None', trackingNumber: o.trackingNumber || 'N/A',
      date: new Date(o.placedAt).toLocaleDateString(),
      items: (o.items ?? []).map((i: any) => ({ name: `${i.productName} (${i.sku})`, qty: i.quantity, price: i.unitPrice })),
    })))).catch(e => setError(e.message))
  }, [])

  return (
    <div className="page-stack">
      {error && <p className="error-banner" role="alert">{error}</p>}
      <section className="page-header">
        <div><p className="eyebrow">Monitoring</p><h2>Orders</h2></div>
      </section>
      <section className="panel-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Customer</th><th>Courier</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="row-clickable" onClick={() => { setSelectedOrder(order); setNewStatus(order.status); setShipment({ courier: order.courier !== 'None' ? order.courier : '', trackingNumber: order.trackingNumber !== 'N/A' ? order.trackingNumber : '' }); setError('') }}>
                  <td>{order.id}</td><td>{order.customer}</td><td>{order.courier}</td><td>{formatMoney(order.total)}</td>
                  <td><span className={`status-pill ${order.status === 'Paid' || order.status === 'Shipped' || order.status === 'Delivered' ? 'success' : 'warning'}`}>{order.status}</span></td>
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
            {error && <p className="error-banner" role="alert">{error}</p>}
            
            <div className="order-modal-grid">
              <div className="order-detail-block">
                <div className="detail-list">
                  <div><label>Customer</label><span>{selectedOrder.customer}</span></div>
                  <div><label>Courier</label><span>{selectedOrder.courier}</span></div>
                  <div><label>Tracking Number</label><span>{selectedOrder.trackingNumber}</span></div>
                </div>
              </div>
              <div className="order-detail-block">
                <label><span>Update Status</span></label>
                <div className="flex gap-2 mt-2">
                  <select aria-label="Order Status" value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full">
                    {['Pending', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button type="button" className="primary-button small-button" disabled={savingStatus} onClick={async () => {
                    setSavingStatus(true); setError('')
                    try {
                      await requestJson(`/api/Order/${selectedOrder.orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
                      setSelectedOrder((c: any) => c ? { ...c, status: newStatus } : c)
                      setOrders((c: any[]) => c.map(o => o.orderId === selectedOrder.orderId ? { ...o, status: newStatus } : o))
                    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update status.') }
                    finally { setSavingStatus(false) }
                  }}>{savingStatus ? 'Saving…' : 'Update'}</button>
                </div>
              </div>
            </div>

            <div className="order-items-header"><h4>Shipment details</h4></div>
            <form className="product-form-grid mb-4" onSubmit={async event => {
              event.preventDefault(); setSavingShipment(true); setError('')
              try {
                await requestJson(`/api/Order/${selectedOrder.orderId}/shipment`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shipment) })
                setSelectedOrder((current: any) => current ? { ...current, status: 'Shipped', courier: shipment.courier, trackingNumber: shipment.trackingNumber } : current)
                setOrders((current: any[]) => current.map(o => o.orderId === selectedOrder.orderId ? { ...o, status: 'Shipped', courier: shipment.courier, trackingNumber: shipment.trackingNumber } : o))
              } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save shipment.') }
              finally { setSavingShipment(false) }
            }}>
              <label><span>Courier Name</span><input required maxLength={100} value={shipment.courier} onChange={e => setShipment({ ...shipment, courier: e.target.value })} /></label>
              <label><span>Tracking Number</span><input required maxLength={100} value={shipment.trackingNumber} onChange={e => setShipment({ ...shipment, trackingNumber: e.target.value })} /></label>
              <button className="primary-button full-span">Save shipment</button>
            </form>

            <div className="order-items-header"><h4>Items</h4></div>
            <div className="order-items-list">
              {(selectedOrder.items ?? []).map((item: any) => (
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
  const [customers, setCustomers] = useState<any[]>([])
  const [error, setError] = useState('')
  useEffect(() => { requestJson('/api/Customer').then(setCustomers).catch(e => setError(e.message)) }, [])
  return (
    <div className="page-stack">
      {error && <p className="error-banner" role="alert">{error}</p>}
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