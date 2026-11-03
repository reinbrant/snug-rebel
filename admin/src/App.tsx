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
import type { CategoryItem, CollectionItem, OrderItem, ProductItem, SessionUser } from './types'

const STORAGE_KEY = 'snug-rebel-admin-session'
const THEME_KEY = 'snug-rebel-admin-theme'

const createVariantTemplate = (overrides: Partial<ProductItem['variants'][number]> = {}): ProductItem['variants'][number] => ({
  id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  sku: `SR-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  size: 'M',
  color: 'Black',
  stock: 12,
  priceOverride: 0,
  isActive: true,
  ...overrides,
})

const productSeed: ProductItem[] = [
  {
    id: 'prd-101',
    displayId: 'SR-OT-01',
    slug: 'oversized-tee',
    name: 'Oversized Tee',
    category: 'Streetwear',
    categoryId: 'ctg-streetwear',
    description: 'Relaxed oversized cotton tee with structured drape.',
    price: 1299,
    material: '100% cotton',
    stock: 42,
    isActive: true,
    status: 'Active',
    sku: 'SR-OT-01',
    variants: [
      createVariantTemplate({ id: 'var-ot-s', sku: 'SR-OT-01-S-BLK', size: 'S', color: 'Black', stock: 12 }),
      createVariantTemplate({ id: 'var-ot-m', sku: 'SR-OT-01-M-BLK', size: 'M', color: 'Black', stock: 14 }),
      createVariantTemplate({ id: 'var-ot-l', sku: 'SR-OT-01-L-BLK', size: 'L', color: 'Black', stock: 9 }),
      createVariantTemplate({ id: 'var-ot-xl', sku: 'SR-OT-01-XL-BLK', size: 'XL', color: 'Black', stock: 7 }),
    ],
  },
  {
    id: 'prd-102',
    displayId: 'SR-UC-11',
    slug: 'utility-cargo',
    name: 'Utility Cargo',
    category: 'Essentials',
    categoryId: 'ctg-essentials',
    description: 'Utility-inspired cargo pant with clean detailing.',
    price: 1899,
    material: 'Cotton twill',
    stock: 11,
    isActive: true,
    status: 'Low stock',
    sku: 'SR-UC-11',
    variants: [
      createVariantTemplate({ id: 'var-uc-30', sku: 'SR-UC-11-30-OLV', size: '30', color: 'Olive', stock: 5 }),
      createVariantTemplate({ id: 'var-uc-32', sku: 'SR-UC-11-32-OLV', size: '32', color: 'Olive', stock: 3 }),
      createVariantTemplate({ id: 'var-uc-34', sku: 'SR-UC-11-34-OLV', size: '34', color: 'Olive', stock: 3 }),
    ],
  },
  {
    id: 'prd-103',
    displayId: 'SR-LS-09',
    slug: 'lightweight-shell',
    name: 'Lightweight Shell',
    category: 'Outerwear',
    categoryId: 'ctg-outerwear',
    description: 'Water-resistant shell built for layering.',
    price: 2399,
    material: 'Ripstop nylon',
    stock: 28,
    isActive: true,
    status: 'Active',
    sku: 'SR-LS-09',
    variants: [
      createVariantTemplate({ id: 'var-ls-s', sku: 'SR-LS-09-S-ASH', size: 'S', color: 'Ash', stock: 6 }),
      createVariantTemplate({ id: 'var-ls-m', sku: 'SR-LS-09-M-ASH', size: 'M', color: 'Ash', stock: 7 }),
      createVariantTemplate({ id: 'var-ls-l', sku: 'SR-LS-09-L-ASH', size: 'L', color: 'Ash', stock: 8 }),
      createVariantTemplate({ id: 'var-ls-xl', sku: 'SR-LS-09-XL-ASH', size: 'XL', color: 'Ash', stock: 7 }),
    ],
  },
  {
    id: 'prd-104',
    displayId: 'SR-CC-22',
    slug: 'cotton-crew',
    name: 'Cotton Crew',
    category: 'Basics',
    categoryId: 'ctg-basics',
    description: 'Essential crew top designed for everyday wear.',
    price: 999,
    material: 'Organic cotton',
    stock: 0,
    isActive: false,
    status: 'Inactive',
    sku: 'SR-CC-22',
    variants: [
      createVariantTemplate({ id: 'var-cc-s', sku: 'SR-CC-22-S-CRM', size: 'S', color: 'Cream', stock: 0, isActive: false }),
      createVariantTemplate({ id: 'var-cc-m', sku: 'SR-CC-22-M-CRM', size: 'M', color: 'Cream', stock: 0, isActive: false }),
    ],
  },
]

const categorySeed: CategoryItem[] = [
  { id: 'ctg-1', name: 'Streetwear', slug: 'streetwear', products: 18, status: 'Active' },
  { id: 'ctg-2', name: 'Essentials', slug: 'essentials', products: 24, status: 'Active' },
  { id: 'ctg-3', name: 'Outerwear', slug: 'outerwear', products: 9, status: 'Hidden' },
]

const collectionSeed: CollectionItem[] = [
  { id: 'col-1', name: 'Summer Drop', products: 12, status: 'Live', launch: '2026-10-25' },
  { id: 'col-2', name: 'City Layers', products: 8, status: 'Scheduled', launch: '2026-11-10' },
]

const orderStatusOptions = ['Pending', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'] as const

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
  {
    id: 'ORD-2403',
    customer: 'Nina Reyes',
    total: 4190,
    status: 'Pending',
    date: '2026-10-27',
    channel: 'Web',
    shippingAddress: 'Davao City, Davao del Sur',
    paymentMethod: 'Maya',
    items: [
      { name: 'Lightweight Shell', qty: 1, price: 2399 },
      { name: 'Utility Cargo', qty: 1, price: 1899 },
    ],
  },
  {
    id: 'ORD-2404',
    customer: 'Evan Lee',
    total: 1330,
    status: 'Shipped',
    date: '2026-10-27',
    channel: 'In-store',
    shippingAddress: 'Cebu Business Park, Cebu',
    paymentMethod: 'Bank transfer',
    items: [
      { name: 'Cotton Crew', qty: 1, price: 999 },
      { name: 'Shipping', qty: 1, price: 331 },
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

const defaultShipmentTable = [
  { id: 'ORD-2401', category: 'Streetwear', weight: '1,280 g', company: 'Snug Rebel Studio', time: '31 Oct, 2026', route: 'Makati - Cebu', value: '₱5,678.00', status: 'Delivered' },
  { id: 'ORD-2402', category: 'Essentials', weight: '920 g', company: 'Northwind Apparel', time: '29 Oct, 2026', route: 'Quezon City - Davao', value: '₱2,940.00', status: 'Processing' },
  { id: 'ORD-2403', category: 'Outerwear', weight: '1,760 g', company: 'City Layers', time: '27 Oct, 2026', route: 'Pasig - Iloilo', value: '₱8,120.00', status: 'Pending' },
  { id: 'ORD-2404', category: 'Accessories', weight: '640 g', company: 'Drift & Co', time: '26 Oct, 2026', route: 'BGC - Cagayan', value: '₱3,410.00', status: 'Delivered' },
]

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

function exportCsv(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) {
    return
  }

  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          const safeValue = String(value ?? '').replace(/"/g, '""')
          return `"${safeValue}"`
        })
        .join(','),
    ),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
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
        <Route
          path="/login"
          element={<LoginPage session={session} onLogin={setSession} theme={theme} onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} />}
        />
        <Route element={<ProtectedLayout session={session} onLogout={() => setSession(null)} theme={theme} onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} />}>
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

function ProtectedLayout({
  session,
  onLogout,
  theme,
  onToggleTheme,
}: {
  session: SessionUser | null
  onLogout: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}) {
  if (!session) {
    return <Navigate to="/login" replace />
  }

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
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  )
}

function LoginPage({
  session,
  onLogin,
  theme,
  onToggleTheme,
}: {
  session: SessionUser | null
  onLogin: (session: SessionUser) => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@snugrebel.com')
  const [password, setPassword] = useState('snUgr3bel@0902')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true })
    }
  }, [navigate, session])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const user = await loginWithEmailPassword(email, password)
      const nextSession: SessionUser = {
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
      }
      onLogin(nextSession)
      navigate('/', { replace: true })
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Unable to sign in.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setError('')
    try {
      await loginWithOAuth(provider)
    } catch (oauthError) {
      const message = oauthError instanceof Error ? oauthError.message : 'OAuth is not ready yet.'
      setError(message)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <div className="login-header">
          <div className="brand-mark large">SR</div>
          <div>
            <p className="eyebrow">Admin Access</p>
            <h2>Snug Rebel</h2>
          </div>
        </div>

        <div className="login-actions-top">
          <button type="button" className="icon-button" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <h1>Sign in</h1>
            <p>Use your staff credentials to manage catalog, orders, and reports.</p>
          </div>

          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@snugrebel.com" />
          </label>

          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
          </label>

          {error ? <div className="error-banner">{error}</div> : null}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="divider"><span>or continue with</span></div>

          <div className="oauth-grid">
            <button type="button" className="secondary-button" onClick={() => handleOAuth('google')}>
              Google
            </button>
            <button type="button" className="secondary-button" onClick={() => handleOAuth('github')}>
              GitHub
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DashboardPage() {
  const [orders] = useState<OrderItem[]>(orderSeed)
  const [activeFilter, setActiveFilter] = useState('All')
  const [analytics, setAnalytics] = useState(defaultAnalytics)
  const [notifications, setNotifications] = useState(defaultShipmentTable)
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
          const normalizedDays = Array.isArray(analyticsPayload.days)
            ? analyticsPayload.days
            : Array.isArray(analyticsPayload.heatmap)
              ? analyticsPayload.heatmap.map((entry: any, index: number) => ({
                  date: `${new Date().toISOString().slice(0, 8)}${String(index + 1).padStart(2, '0')}`,
                  value: Array.isArray(entry?.values) ? Math.max(...entry.values.map((value: number) => Number(value) || 0)) : 0,
                  orders: Array.isArray(entry?.values) ? entry.values.reduce((sum: number, value: number) => sum + (Number(value) || 0), 0) : 0,
                  total: Array.isArray(entry?.values) ? entry.values.reduce((sum: number, value: number) => sum + (Number(value) || 0), 0) : 0,
                  isCurrentDay: false,
                }))
              : defaultAnalytics.days

          const numericValues: number[] = normalizedDays
            .map((entry: any) => Number(entry?.orders ?? entry?.value ?? 0))
            .filter((value: number) => Number.isFinite(value))

          const nextMinimum = Number(analyticsPayload.minimumNumber ?? (numericValues.length ? Math.min(...numericValues) : defaultAnalytics.minimumNumber))
          const nextAverage = Number(analyticsPayload.averageNumber ?? (numericValues.length ? Math.round(numericValues.reduce((sum: number, value: number) => sum + value, 0) / numericValues.length) : defaultAnalytics.averageNumber))
          const nextMaximum = Number(analyticsPayload.maximumNumber ?? (numericValues.length ? Math.max(...numericValues) : defaultAnalytics.maximumNumber))

          setAnalytics({
            minimumNumber: nextMinimum,
            averageNumber: nextAverage,
            maximumNumber: nextMaximum,
            monthLabel: analyticsPayload.monthLabel ?? defaultAnalytics.monthLabel,
            days: normalizedDays,
          })
        }

        if (activitiesResponse.ok) {
          const activitiesPayload = await activitiesResponse.json()
          const nextItems = (activitiesPayload.items ?? []).map((item: any) => ({
            id: item.orderId ?? item.orderNumber ?? 'unknown',
            category: item.category ?? 'General',
            weight: item.weight ?? '0 g',
            company: item.company ?? 'Unknown',
            time: item.arrivalTime ? new Date(item.arrivalTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A',
            route: item.route ?? 'N/A',
            value: item.price ? `₱${Number(item.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00',
            status: item.status ?? 'Pending',
          }))

          if (nextItems.length > 0) {
            setNotifications(nextItems)
          }
        }
      } catch {
        // Keep the seeded dashboard values if the backend is unavailable.
      }
    }

    loadDashboardData()
  }, [])

  const filteredShipments =
    activeFilter === 'All'
      ? notifications
      : notifications.filter((shipment) => shipment.status === activeFilter)

  function handleExport() {
    exportCsv(
      'snug-rebel-dashboard.csv',
      orders.map((order) => ({
        id: order.id,
        customer: order.customer,
        total: order.total,
        status: order.status,
        date: order.date,
        channel: order.channel,
      })),
    )
  }

  return (
    <div className="page-stack">
      <section className="page-header dashboard-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Tracking Orders List</h2>
        </div>
        <button type="button" className="primary-button small-button" onClick={handleExport}>
          <Download size={16} />
          Export data
        </button>
      </section>

      <section className="database-panel panel-card">
        <div className="database-head">
          <div className="database-title">
            <div className="database-icon" aria-hidden="true">◌</div>
            <div>
              <p className="eyebrow">Orders database</p>
              <strong>Today - {dashboardDateLabel}</strong>
            </div>
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
            <div>
              <p className="eyebrow">Analytics</p>
              <h3>Analytic view</h3>
            </div>
            <div className="segmented-control" aria-label="Analytics timeframe selector">
              <button type="button" className="segment active">Day</button>
              <button type="button" className="segment">Week</button>
              <button type="button" className="segment">Month</button>
              <button type="button" className="segment">Quarter</button>
              <button type="button" className="segment">Year</button>
            </div>
          </div>

          <div className="analytic-metrics">
            <div className="analytic-metric">
              <strong>{analytics.minimumNumber}</strong>
              <span>minimum number</span>
            </div>
            <div className="analytic-metric">
              <strong>{analytics.averageNumber}</strong>
              <span>average number</span>
            </div>
            <div className="analytic-metric">
              <strong>{analytics.maximumNumber}</strong>
              <span>maximum number</span>
            </div>
          </div>

          <div className="heatmap-calendar-wrapper" aria-label="Analytic heat map calendar">
            <div className="heatmap-weekday-row">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <span key={day} className="heatmap-weekday">{day}</span>
              ))}
            </div>

            <div className="heatmap-calendar-grid">
              {calendarCells.map((cell) => {
                const activeOrders = Number(cell.entry?.orders ?? 0)
                const threshold = Math.max(2, Math.ceil(maxHeatOrders / 3))
                const intensity = activeOrders > 0
                  ? Math.min(1, 0.08 + Math.max(0, activeOrders - 1) / Math.max(1, threshold) * 0.92)
                  : 0

                return (
                  <div
                    key={cell.date}
                    className={`heatmap-calendar-cell ${!cell.inMonth ? 'blank' : ''} ${cell.isCurrentDay ? 'current' : ''}`}
                    style={{
                      opacity: 1,
                      background: activeOrders > 0 ? `rgba(45, 143, 91, ${intensity})` : 'rgba(255, 255, 255, 0.96)',
                    }}
                  >
                    <div className="calendar-cell-content">
                      <span className="calendar-day-number">{cell.dayNumber}</span>
                      {activeOrders > 0 ? (
                        <>
                          <span className="calendar-badge">{activeOrders}</span>
                          <span className="calendar-total">{Math.round(Number(cell.entry?.total ?? 0))}</span>
                        </>
                      ) : null}
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
          <div>
            <p className="eyebrow">Notifications</p>
            <h3>Recent activities</h3>
          </div>

          <div className="activity-filters">
            {activityFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`activity-filter ${filter === activeFilter ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Category</th>
                <th>Weight</th>
                <th>Company</th>
                <th>Arrival time</th>
                <th>Route</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td>{shipment.id}</td>
                  <td>{shipment.category}</td>
                  <td>{shipment.weight}</td>
                  <td>{shipment.company}</td>
                  <td>{shipment.time}</td>
                  <td>{shipment.route}</td>
                  <td>{shipment.value}</td>
                  <td>
                    <span className={`status-pill ${shipment.status === 'Delivered' ? 'success' : shipment.status === 'Processing' ? 'warning' : 'neutral'}`}>
                      {shipment.status}
                    </span>
                  </td>
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
  const [products, setProducts] = useState<ProductItem[]>(productSeed)
  const [form, setForm] = useState({
    displayId: '',
    slug: '',
    name: '',
    category: 'Streetwear',
    categoryId: 'ctg-streetwear',
    description: '',
    material: '',
    price: '1499',
    stock: '20',
    isActive: true,
    variants: [createVariantTemplate({ sku: 'SR-OT-01-M-BLK', size: 'M', color: 'Black', stock: 20 })],
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [modelsVersion, setModelsVersion] = useState(0)

  function handleChange(field: string, value: string | boolean | ProductItem['variants']) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleVariantChange(index: number, field: keyof ProductItem['variants'][number], value: string | number | boolean) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant,
      ),
    }))
  }

  function handleAddVariant() {
    setForm((current) => ({
      ...current,
      variants: [...current.variants, createVariantTemplate()],
    }))
  }

  function handleRemoveVariant(index: number) {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
    }))
  }

  function getTotalStock(variants: ProductItem['variants']) {
    return variants.reduce((sum, variant) => sum + Math.max(0, variant.stock), 0)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedVariants = form.variants
      .filter((variant) => variant.size || variant.color || variant.sku)
      .map((variant) => ({
        ...variant,
        sku: variant.sku || `SR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        stock: Number(variant.stock) || 0,
        priceOverride: Number(variant.priceOverride) || 0,
      }))

    const totalStock = getTotalStock(normalizedVariants)

    const nextProduct: ProductItem = {
      id: editingId ?? `prd-${Date.now()}`,
      displayId: form.displayId || `SR-${(Math.random() + 1).toString(36).slice(2, 6).toUpperCase()}`,
      slug: form.slug || (form.name || 'new-product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name: form.name || 'New product',
      category: form.category,
      categoryId: form.categoryId,
      description: form.description || 'New product description.',
      material: form.material || 'Cotton blend',
      price: Number(form.price) || 0,
      stock: totalStock,
      isActive: form.isActive,
      status: form.isActive ? (totalStock <= 0 ? 'Draft' : totalStock < 12 ? 'Low stock' : 'Active') : 'Inactive',
      sku: form.displayId || `SR-${(Math.random() + 1).toString(36).slice(2, 6).toUpperCase()}`,
      variants: normalizedVariants,
    }

    if (editingId) {
      setProducts((current) => current.map((item) => (item.id === editingId ? nextProduct : item)))
    } else {
      setProducts((current) => [nextProduct, ...current])
    }

    setForm({
      displayId: '',
      slug: '',
      name: '',
      category: 'Streetwear',
      categoryId: 'ctg-streetwear',
      description: '',
      material: '',
      price: '1499',
      stock: '20',
      isActive: true,
      variants: [createVariantTemplate({ sku: 'SR-OT-01-M-BLK', size: 'M', color: 'Black', stock: 20 })],
    })
    setEditingId(null)
    setIsProductModalOpen(false)
  }

  function handleEdit(product: ProductItem) {
    setEditingId(product.id)
    setForm({
      displayId: product.displayId || product.sku,
      slug: product.slug,
      name: product.name,
      category: product.category,
      categoryId: product.categoryId || 'ctg-streetwear',
      description: product.description || '',
      material: product.material || '',
      price: String(product.price),
      stock: String(product.stock),
      isActive: product.isActive,
      variants: product.variants.length ? product.variants : [createVariantTemplate()],
    })
    setIsProductModalOpen(true)
  }

  function handleDeactivate(id: string) {
    setProducts((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              isActive: false,
              status: 'Inactive',
              variants: item.variants.map((variant) => ({ ...variant, isActive: false })),
            }
          : item,
      ),
    )
    setSelectedProduct((current) =>
      current && current.id === id ? { ...current, isActive: false, status: 'Inactive', variants: current.variants.map((variant) => ({ ...variant, isActive: false })) } : current,
    )
  }

  function openProductDetails(product: ProductItem) {
    setSelectedProduct(product)
  }

  function openCreateProductModal() {
    setEditingId(null)
    setForm({
      displayId: '',
      slug: '',
      name: '',
      category: 'Streetwear',
      categoryId: 'ctg-streetwear',
      description: '',
      material: '',
      price: '1499',
      stock: '20',
      isActive: true,
      variants: [createVariantTemplate({ sku: 'SR-OT-01-M-BLK', size: 'M', color: 'Black', stock: 20 })],
    })
    setIsProductModalOpen(true)
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Catalog</p>
          <h2>Products</h2>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="secondary-button small-button"
            onClick={() =>
              exportCsv(
                'products-export.csv',
                products.map((item) => ({
                  id: item.id,
                  name: item.name,
                  category: item.category,
                  price: item.price,
                  stock: item.stock,
                  status: item.status,
                })),
              )
            }
          >
            <Download size={16} />
            Export CSV
          </button>
          <button type="button" className="primary-button small-button" onClick={openCreateProductModal}>
            <Plus size={16} />
            Create product
          </button>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Catalog</p>
            <h3>Current items</h3>
          </div>
        </div>

        <div className="table-wrap compact">
          <table>
            <thead>
              <tr>
                <th>Display ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="row-clickable" onClick={() => openProductDetails(product)}>
                  <td>{product.displayId}</td>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>{formatMoney(product.price)}</td>
                  <td>{product.stock}</td>
                  <td>
                    <span
                      className={`status-pill ${
                        product.status === 'Active' ? 'success' : product.status === 'Low stock' ? 'warning' : 'neutral'
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedProduct ? (
        <div className="order-modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="order-modal" onClick={(event) => event.stopPropagation()}>
            <div className="order-modal-header">
              <div>
                <p className="eyebrow">Product details</p>
                <h3>{selectedProduct.name}</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedProduct(null)} aria-label="Close product details">
                ×
              </button>
            </div>

            <div className="order-modal-grid">
              <div className="order-detail-block">
                <div className="detail-list">
                  <div>
                    <label>Display ID</label>
                    <span>{selectedProduct.displayId}</span>
                  </div>
                  <div>
                    <label>Slug</label>
                    <span>{selectedProduct.slug}</span>
                  </div>
                  <div>
                    <label>Category</label>
                    <span>{selectedProduct.category}</span>
                  </div>
                  <div>
                    <label>Material</label>
                    <span>{selectedProduct.material || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              <div className="order-detail-block">
                <div className="detail-list">
                  <div>
                    <label>Price</label>
                    <span>{formatMoney(selectedProduct.price)}</span>
                  </div>
                  <div>
                    <label>Stock</label>
                    <span>{selectedProduct.stock} units</span>
                  </div>
                  <div>
                    <label>Status</label>
                    <span
                      className={`status-pill ${
                        selectedProduct.status === 'Active' ? 'success' : selectedProduct.status === 'Low stock' ? 'warning' : 'neutral'
                      }`}
                    >
                      {selectedProduct.status}
                    </span>
                  </div>
                  <div>
                    <label>Variants</label>
                    <span>{selectedProduct.variants.length} options</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-items-header">
              <h4>Description</h4>
            </div>
            <p className="empty-state-copy">{selectedProduct.description || 'No description yet.'}</p>

            <div className="order-items-header">
              <h4>Inventory</h4>
            </div>

            <div className="inventory-table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Size</th>
                    <th>Color</th>
                    <th>Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.variants.map((variant) => (
                    <tr key={variant.id}>
                      <td>{variant.sku}</td>
                      <td>{variant.size}</td>
                      <td>{variant.color}</td>
                      <td>{variant.stock}</td>
                      <td>
                        <span className={`status-pill ${variant.isActive ? 'success' : 'neutral'}`}>
                          {variant.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="order-items-header">
              <h4>3D models</h4>
            </div>

            <Model3DUpload
              productId={selectedProduct.id}
              onUploadSuccess={() => setModelsVersion((version) => version + 1)}
            />
            <Model3DList productId={selectedProduct.id} refreshKey={modelsVersion} />

            <div className="order-items-header">
              <h4>Actions</h4>
            </div>

            <div className="order-items-list">
              <div className="order-item-row">
                <div>
                  <strong>Product actions</strong>
                  <span>Update, review, or deactivate this item</span>
                </div>
                <div className="actions-cell">
                  <button
                    type="button"
                    className="primary-button small-button"
                    onClick={() => {
                      setSelectedProduct(null)
                      handleEdit(selectedProduct)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="link-button danger"
                    onClick={() => {
                      setSelectedProduct(null)
                      handleDeactivate(selectedProduct.id)
                    }}
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isProductModalOpen ? (
        <div className="order-modal-backdrop" onClick={() => setIsProductModalOpen(false)}>
          <div className="order-modal product-modal" onClick={(event) => event.stopPropagation()}>
            <div className="order-modal-header">
              <div>
                <p className="eyebrow">Catalog</p>
                <h3>{editingId ? 'Edit product' : 'Create product'}</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setIsProductModalOpen(false)} aria-label="Close product form">
                ×
              </button>
            </div>

            <form className="product-form-grid" onSubmit={handleSubmit}>
              <label>
                <span>Display ID</span>
                <input value={form.displayId} onChange={(event) => handleChange('displayId', event.target.value)} placeholder="SR-OT-01" />
              </label>

              <label>
                <span>Slug</span>
                <input value={form.slug} onChange={(event) => handleChange('slug', event.target.value)} placeholder="oversized-tee" />
              </label>

              <label className="full-span">
                <span>Product name</span>
                <input value={form.name} onChange={(event) => handleChange('name', event.target.value)} placeholder="Oversized Tee" />
              </label>

              <label>
                <span>Category</span>
                <select
                  value={form.category}
                  onChange={(event) => {
                    const selected = event.target.value
                    const categoryMap: Record<string, string> = {
                      Streetwear: 'ctg-streetwear',
                      Essentials: 'ctg-essentials',
                      Outerwear: 'ctg-outerwear',
                      Basics: 'ctg-basics',
                    }
                    handleChange('category', selected)
                    handleChange('categoryId', categoryMap[selected] ?? 'ctg-streetwear')
                  }}
                >
                  <option>Streetwear</option>
                  <option>Essentials</option>
                  <option>Outerwear</option>
                  <option>Basics</option>
                </select>
              </label>

              <label>
                <span>Material</span>
                <input value={form.material} onChange={(event) => handleChange('material', event.target.value)} placeholder="Cotton blend" />
              </label>

              <label className="full-span">
                <span>Description</span>
                <textarea value={form.description} onChange={(event) => handleChange('description', event.target.value)} rows={4} placeholder="Describe the product, fit, and the core material story." />
              </label>

              <label>
                <span>Base price</span>
                <input type="number" value={form.price} onChange={(event) => handleChange('price', event.target.value)} />
              </label>

              <label>
                <span>Active</span>
                <input type="checkbox" checked={form.isActive} onChange={(event) => handleChange('isActive', event.target.checked)} />
              </label>

              <div className="full-span inventory-editor">
                <div className="inventory-editor-header">
                  <h4>Variant inventory</h4>
                  <button type="button" className="secondary-button small-button" onClick={handleAddVariant}>Add variant</button>
                </div>

                {form.variants.map((variant, index) => (
                  <div key={variant.id} className="variant-row">
                    <div className="variant-grid">
                      <label>
                        <span>SKU</span>
                        <input value={variant.sku} onChange={(event) => handleVariantChange(index, 'sku', event.target.value)} />
                      </label>

                      <label>
                        <span>Size</span>
                        <input value={variant.size} onChange={(event) => handleVariantChange(index, 'size', event.target.value)} />
                      </label>

                      <label>
                        <span>Color</span>
                        <input value={variant.color} onChange={(event) => handleVariantChange(index, 'color', event.target.value)} />
                      </label>

                      <label>
                        <span>Stock</span>
                        <input type="number" value={variant.stock} onChange={(event) => handleVariantChange(index, 'stock', Number(event.target.value))} />
                      </label>

                      <label>
                        <span>Price override</span>
                        <input type="number" value={variant.priceOverride ?? 0} onChange={(event) => handleVariantChange(index, 'priceOverride', Number(event.target.value))} />
                      </label>

                      <label className="toggle-row compact-toggle">
                        <span>Active</span>
                        <input type="checkbox" checked={variant.isActive} onChange={(event) => handleVariantChange(index, 'isActive', event.target.checked)} />
                      </label>
                    </div>

                    {form.variants.length > 1 ? (
                      <button type="button" className="link-button danger" onClick={() => handleRemoveVariant(index)}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="full-span inventory-editor">
                <div className="inventory-editor-header">
                  <h4>3D models</h4>
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
                  <p className="empty-state-copy">
                    Save the product first, then edit it or open its details to upload 3D models.
                  </p>
                )}
              </div>

              <div className="product-form-actions full-span">
                <button type="button" className="secondary-button" onClick={() => setIsProductModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editingId ? 'Save changes' : 'Create product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
function CategoriesPage() {
  const [items, setItems] = useState<CategoryItem[]>(categorySeed)

  function handleAdd() {
    const next: CategoryItem = {
      id: `ctg-${Date.now()}`,
      name: 'New category',
      slug: 'new-category',
      products: 0,
      status: 'Active',
    }
    setItems((current) => [next, ...current])
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Catalog setup</p>
          <h2>Categories</h2>
        </div>
        <button type="button" className="primary-button small-button" onClick={handleAdd}>
          <FolderKanban size={16} />
          Add category
        </button>
      </section>

      <section className="panel-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Products</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.slug}</td>
                  <td>{item.products}</td>
                  <td>
                    <span className={`status-pill ${item.status === 'Active' ? 'success' : 'neutral'}`}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function CollectionsPage() {
  const [items, setItems] = useState<CollectionItem[]>(collectionSeed)

  function handleAdd() {
    const next: CollectionItem = {
      id: `col-${Date.now()}`,
      name: 'New collection',
      products: 0,
      status: 'Scheduled',
      launch: '2026-11-15',
    }
    setItems((current) => [next, ...current])
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Marketing</p>
          <h2>Collections</h2>
        </div>
        <button type="button" className="primary-button small-button" onClick={handleAdd}>
          <Layers3 size={16} />
          Add collection
        </button>
      </section>

      <section className="panel-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Products</th>
                <th>Launch</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.products}</td>
                  <td>{item.launch}</td>
                  <td>
                    <span className={`status-pill ${item.status === 'Live' ? 'success' : 'warning'}`}>{item.status}</span>
                  </td>
                </tr>
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

  function updateStatus(id: string, status: OrderItem['status']) {
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)))
    setSelectedOrder((current) => (current && current.id === id ? { ...current, status } : current))
  }

  function handleExport() {
    exportCsv(
      'orders-export.csv',
      orders.map((order) => ({
        id: order.id,
        customer: order.customer,
        total: order.total,
        status: order.status,
        date: order.date,
        channel: order.channel,
      })),
    )
  }

  function getStatusTone(status: OrderItem['status']) {
    if (status === 'Paid' || status === 'Shipped' || status === 'Delivered') {
      return 'success'
    }
    if (status === 'Processing' || status === 'Pending') {
      return 'warning'
    }
    return 'neutral'
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Monitoring</p>
          <h2>Orders</h2>
        </div>
        <button type="button" className="primary-button small-button" onClick={handleExport}>
          <Download size={16} />
          Export orders
        </button>
      </section>

      <section className="panel-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="row-clickable" onClick={() => setSelectedOrder(order)}>
                  <td>{order.id}</td>
                  <td>{order.customer}</td>
                  <td>{formatMoney(order.total)}</td>
                  <td>
                    <span className={`status-pill ${getStatusTone(order.status)}`}>{order.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder ? (
        <div className="order-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="order-modal" onClick={(event) => event.stopPropagation()}>
            <div className="order-modal-header">
              <div>
                <p className="eyebrow">Order details</p>
                <h3>{selectedOrder.id}</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedOrder(null)} aria-label="Close order details">
                ×
              </button>
            </div>

            <div className="order-modal-grid">
              <div className="order-detail-block">
                <div className="order-identity">
                  <strong>{selectedOrder.customer}</strong>
                  <span>{selectedOrder.channel}</span>
                </div>
                <div className="detail-list">
                  <div>
                    <label>Date</label>
                    <span>{selectedOrder.date}</span>
                  </div>
                  <div>
                    <label>Shipping</label>
                    <span>{selectedOrder.shippingAddress ?? 'Not provided'}</span>
                  </div>
                  <div>
                    <label>Payment</label>
                    <span>{selectedOrder.paymentMethod ?? 'Card'}</span>
                  </div>
                  <div>
                    <label>Total</label>
                    <span>{formatMoney(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              <div className="order-detail-block">
                <label>
                  <span>Current status</span>
                  <select value={selectedOrder.status} onChange={(event) => updateStatus(selectedOrder.id, event.target.value as OrderItem['status'])}>
                    {orderStatusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>

                <div className="detail-list compact">
                  <div>
                    <label>Order status</label>
                    <span className={`status-pill ${getStatusTone(selectedOrder.status)}`}>{selectedOrder.status}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-items-header">
              <h4>Items</h4>
              <strong>{selectedOrder.items?.length ?? 0} line items</strong>
            </div>

            <div className="order-items-list">
              {(selectedOrder.items ?? []).map((item) => (
                <div key={`${selectedOrder.id}-${item.name}`} className="order-item-row">
                  <div>
                    <strong>{item.name}</strong>
                    <span>Qty {item.qty}</span>
                  </div>
                  <span>{formatMoney(item.price)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CustomersPage() {
  const customers = [
    { id: 'USR-1001', name: 'Maya Santos', email: 'maya@demo.com', orders: 16, lifetime: 28360 },
    { id: 'USR-1002', name: 'Liam Cruz', email: 'liam@demo.com', orders: 8, lifetime: 15420 },
    { id: 'USR-1003', name: 'Nina Reyes', email: 'nina@demo.com', orders: 11, lifetime: 22500 },
  ]

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">People</p>
          <h2>Customers</h2>
        </div>
      </section>

      <section className="panel-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Orders</th>
                <th>Lifetime</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.id}</td>
                  <td>{customer.name}</td>
                  <td>{customer.email}</td>
                  <td>{customer.orders}</td>
                  <td>{formatMoney(customer.lifetime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default App