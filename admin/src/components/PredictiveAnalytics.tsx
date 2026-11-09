import { useEffect, useState } from 'react'
import { requestJson } from '../lib/config'
import './PredictiveAnalytics.css'

type Month = { month: string; sales: number; orders: number; observed: boolean; previousYearSales: number | null }
type DemographicBucket = { label: string; customers: number; share: number }
type SeasonalForecast = {
  available: boolean; message: string; completeMonths: number; historyOrders: number; method: string
  months: { month: string; sales: number; lower: number; upper: number; orders: number; seasonalIndex: number }[]
}
type Insights = {
  generatedAt: string; windowDays: number; periodStart: string; periodEnd: string
  orders: number; sales: number; averageOrderValue: number; salesChangePercent: number | null
  customers: number; repeatCustomers: number; unidentifiedOrders: number
  regions: { region: string; orders: number; customers: number; sales: number; share: number }[]
  months: Month[]
  forecast: { available: boolean; sales: number | null; lower: number | null; upper: number | null; orders: number | null; historyDays: number; historyOrders: number; method: string }
  actions: { title: string; evidence: string; action: string }[]
  demographics?: { registeredCustomers: number; sharedProfiles: number; guestOrders: number; ageRanges: DemographicBucket[]; genders: DemographicBucket[] }
  seasonalForecast?: SeasonalForecast
}

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value)
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
const monthLabel = (value: string) => new Intl.DateTimeFormat('en-PH', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${value}-01T00:00:00Z`))

export function PredictiveAnalytics() {
  const [days, setDays] = useState(90)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const [metric, setMetric] = useState<'sales' | 'orders'>('sales')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    requestJson<Insights>(`/api/Dashboard/insights?days=${days}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setInsights(data) })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load sales insights.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [days, retry])

  const data = insights
  const selected = data?.months.find(month => month.month === selectedMonth)
  const max = Math.max(1, ...(data?.months.map(month => month[metric]) ?? []))

  return <section className="insights" aria-labelledby="insights-title" aria-busy={loading}>
    <div className="insights-heading">
      <div><p className="eyebrow">Business intelligence</p><h2 id="insights-title">Sales & customer insights</h2></div>
      <label className="insights-period">Reporting period
        <select value={days} onChange={event => { setLoading(true); setError(''); setDays(Number(event.target.value)) }}>
          <option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 365 days</option>
        </select>
      </label>
    </div>
    {loading && <p className="insights-message" role="status">Loading sales insights…</p>}
    {error && <div className="error-banner" role="alert">{error} <button type="button" className="secondary-button small-button" onClick={() => { setLoading(true); setError(''); setRetry(value => value + 1) }}>Retry insights</button></div>}
    {!loading && !error && data && <>
      <p className="insights-caption">{dateLabel(data.periodStart)} – {dateLabel(data.periodEnd)} · Completed days in Philippine time (UTC+8)</p>
      <div className="insights-summary">
        <article className="panel-card"><span>Merchandise sales</span><strong>{money(data.sales)}</strong><small>{data.salesChangePercent === null ? 'No comparable sales baseline' : `${data.salesChangePercent > 0 ? '+' : ''}${data.salesChangePercent}% vs previous ${data.windowDays} days`}</small></article>
        <article className="panel-card"><span>Qualifying orders</span><strong>{data.orders.toLocaleString()}</strong><small>Paid or delivered orders</small></article>
        <article className="panel-card"><span>Average order value</span><strong>{money(data.averageOrderValue)}</strong><small>Merchandise sales per order</small></article>
        <article className="panel-card"><span>Repeat customers</span><strong>{data.customers ? `${Math.round(data.repeatCustomers / data.customers * 100)}%` : '—'}</strong><small>{data.repeatCustomers} of {data.customers} identifiable customers</small></article>
      </div>

      <article className="panel-card insights-forecast">
        <div><p className="eyebrow">Planning estimate</p><h3>Next 30 days</h3>
          {data.forecast.available ? <><strong className="insights-prediction">{money(data.forecast.sales!)}</strong><p>About {data.forecast.orders} orders · Planning range {money(data.forecast.lower!)} – {money(data.forecast.upper!)}</p></>
            : <p className="insights-message">A forecast becomes available after at least 28 completed days and 10 qualifying orders. Current forecast window: {data.forecast.historyDays} days and {data.forecast.historyOrders} orders.</p>}
        </div>
        <details><summary>How this estimate works</summary><p>{data.forecast.method}</p><p>Estimates assume recent buying patterns continue. Promotions, stockouts, holidays and future cancellations can change the outcome.</p></details>
      </article>

      {data.seasonalForecast ? <SeasonalForecastPanel forecast={data.seasonalForecast} /> : <p className="insights-message">Seasonal projections require the latest backend deployment.</p>}

      <article className="panel-card">
        <p className="eyebrow">Optional profile responses</p><h3>Age & gender</h3>
        {data.demographics ? <>
          <p className="insights-caption">{data.demographics.sharedProfiles} of {data.demographics.registeredCustomers} registered buyers shared profile answers · Last {data.windowDays} completed days. {data.demographics.guestOrders} guest orders are excluded from these breakdowns.</p>
          <div className="insights-columns insights-demographic-groups">
            <DemographicChart title="Age range" buckets={data.demographics.ageRanges} />
            <DemographicChart title="Gender" buckets={data.demographics.genders} />
          </div>
          <p className="insights-caption">Counts use unique registered buyers and their current, self-reported profile answers. Each share uses all registered buyers as its denominator, including “Not shared.” These responses may not represent all customers.</p>
        </> : <p className="insights-message">Profile demographics require the latest backend deployment.</p>}
      </article>

      <div className="insights-columns">
        <article className="panel-card insights-seasonal">
          <div className="insights-heading"><div><p className="eyebrow">Seasonal sales</p><h3>24 completed months</h3></div>
            <label className="insights-period">Chart measure<select value={metric} onChange={event => setMetric(event.target.value as 'sales' | 'orders')}><option value="sales">Sales (PHP)</option><option value="orders">Orders</option></select></label>
          </div>
          <p className="insights-caption">Select a month to compare with the same month last year. Repeated peaks can suggest seasonality.</p>
          <div className="insights-chart-scroll"><div className="insights-chart" role="group" aria-label={`Monthly ${metric} over the last 24 completed months`}>
            {data.months.map(month => <button type="button" key={month.month} aria-pressed={selectedMonth === month.month} className={`insights-bar ${!month.observed ? 'unobserved' : ''}`} onClick={() => setSelectedMonth(month.month)}
              title={`${monthLabel(month.month)}: ${month.observed ? `${money(month.sales)}, ${month.orders} orders` : 'Before available history'}`}
              aria-label={`${monthLabel(month.month)}: ${month.observed ? metric === 'sales' ? money(month.sales) : `${month.orders} orders` : 'Before available history'}`}>
              <span className="insights-bar-track"><span style={{ height: `${Math.max(1, Math.max(0, month[metric]) / max * 100)}%` }} /></span><span className="insights-bar-label">{monthLabel(month.month)}</span>
            </button>)}
          </div></div>
          <p className="insights-month-detail" aria-live="polite">{selected ? !selected.observed ? `${monthLabel(selected.month)}: before available order history.` : `${monthLabel(selected.month)}: ${money(selected.sales)} from ${selected.orders} orders. ${selected.previousYearSales === null ? 'Prior-year comparison unavailable.' : `Same month last year: ${money(selected.previousYearSales)}.`}` : 'Select a bar for the exact values. Muted bars precede available order history.'}</p>
          <details><summary>View monthly data</summary><div className="table-wrap"><table><caption className="insights-caption">Merchandise sales; oldest observed month may have partial coverage.</caption><thead><tr><th>Month</th><th>Sales</th><th>Orders</th><th>Prior year</th></tr></thead><tbody>{data.months.map(month => <tr key={month.month}><th scope="row">{monthLabel(month.month)}</th><td>{month.observed ? money(month.sales) : 'No history'}</td><td>{month.observed ? month.orders : '—'}</td><td>{month.previousYearSales === null ? '—' : money(month.previousYearSales)}</td></tr>)}</tbody></table></div></details>
        </article>

        <article className="panel-card insights-demographics">
          <p className="eyebrow">Customer demographics</p><h3>Where customers order</h3>
          <p className="insights-caption">Shipping province and country · Last {data.windowDays} completed days</p>
          {data.regions.length ? <div className="table-wrap"><table><thead><tr><th>Region</th><th>Orders</th><th>Share</th><th>Sales</th></tr></thead><tbody>{data.regions.map(region => <tr key={region.region}><th scope="row">{region.region}</th><td>{region.orders}</td><td>{region.share}%</td><td>{money(region.sales)}</td></tr>)}</tbody></table></div> : <p className="insights-message">No qualifying orders in this period.</p>}
          <p className="insights-caption">{data.customers} identifiable customers; {data.customers - data.repeatCustomers} ordered once and {data.repeatCustomers} ordered multiple times within this period. {data.unidentifiedOrders} orders have no customer identifier.</p>
          <p className="insights-caption">Purchase behavior is matched by email, falling back to account ID. Optional profile demographics are grouped separately by registered account.</p>
        </article>
      </div>

      <article className="panel-card">
        <p className="eyebrow">Based on your data</p><h3>Recommended actions</h3>
        <div className="insights-actions">{data.actions.map((action, index) => <div key={action.title} className="insights-action"><span className="insights-action-number">{index + 1}</span><div><h4>{action.title}</h4><p className="insights-caption">{action.evidence}</p><p>{action.action}</p></div></div>)}</div>
      </article>
      <details className="panel-card insights-definitions"><summary>Data coverage & definitions</summary>
        <p>Sales are order totals less shipping charges, after discounts. Includes paid orders, delivered orders (including cash on delivery), and processing/shipped orders with a paid payment. Excludes pending, cancelled, refunded and test orders. Dates use order placement time; today is excluded to avoid partial-day comparisons.</p>
        <p>Up to 24 completed months plus the current month are analyzed. A zero after the first qualifying order means no qualifying sales recorded; earlier months show no history. Repeat customers purchased more than once within the selected period; this is not a lifetime retention rate. Prior-year comparisons need recorded history for that month.</p>
        <p>Recommendations are automatic rules based on observed changes, customer behavior, geographic concentration and available seasonal projections. The 30-day forecast uses weekday averages; six-month seasonal projections use two completed annual cycles. Forecasts are planning estimates.</p>
        <p>Updated {new Date(data.generatedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Philippine time).</p>
      </details>
    </>}
  </section>
}

function DemographicChart({ title, buckets }: { title: string; buckets: DemographicBucket[] }) {
  return <section aria-label={title}><h4>{title}</h4><ul className="insights-demographic-bars">{buckets.map(bucket => <li key={bucket.label}>
    <div><span>{bucket.label}</span><strong>{bucket.customers} <small>({bucket.share}%)</small></strong></div>
    <div className="insights-demographic-track" aria-hidden="true"><span style={{ width: `${bucket.share}%` }} /></div>
  </li>)}</ul></section>
}

function SeasonalForecastPanel({ forecast }: { forecast: SeasonalForecast }) {
  const [metric, setMetric] = useState<'sales' | 'orders'>('sales')
  const max = Math.max(1, ...forecast.months.map(month => month[metric]))
  return <article className="panel-card insights-seasonal-forecast" aria-labelledby="seasonal-forecast-heading">
    <div className="insights-heading"><div><p className="eyebrow">Seasonal forecasting</p><h3 id="seasonal-forecast-heading">Next six complete months</h3></div>
      {forecast.available && <label className="insights-period">Forecast measure<select value={metric} onChange={event => setMetric(event.target.value as 'sales' | 'orders')}><option value="sales">Sales (PHP)</option><option value="orders">Orders</option></select></label>}
    </div>
    <p className="insights-caption">{forecast.message}</p>
    {forecast.available ? <>
      <div className="insights-chart-scroll"><div className="insights-chart insights-future-chart" role="group" aria-label={`Seasonal ${metric} projections`}>
        {forecast.months.map(month => <div key={month.month} className="insights-future-bar" tabIndex={0} aria-label={`${monthLabel(month.month)}: ${money(month.sales)} projected sales, ${month.orders} projected orders, seasonal factor ${month.seasonalIndex}`} title={`Planning range ${money(month.lower)}–${money(month.upper)}`}>
          <strong>{metric === 'sales' ? money(month.sales) : month.orders.toLocaleString()}</strong>
          <span className="insights-bar-track"><span style={{ height: `${Math.max(1, month[metric] / max * 100)}%` }} /></span><span>{monthLabel(month.month)}</span>
        </div>)}
      </div></div>
      <div className="table-wrap"><table><caption className="insights-caption">Estimated demand, not confirmed sales. Factor 1× means typical daily demand; 1.5× means 50% above the model's usual daily level.</caption><thead><tr><th>Month</th><th>Sales estimate</th><th>Planning range</th><th>Orders</th><th>Seasonal factor</th></tr></thead><tbody>{forecast.months.map(month => <tr key={month.month}><th scope="row">{monthLabel(month.month)}</th><td>{money(month.sales)}</td><td>{money(month.lower)} – {money(month.upper)}</td><td>{month.orders}</td><td>{month.seasonalIndex}×</td></tr>)}</tbody></table></div>
    </> : <p className="insights-message">Available coverage: {forecast.completeMonths}/24 complete months · {forecast.historyOrders}/60 qualifying orders. Seasonal estimates also need activity in 18 months and 10 orders in each annual cycle.</p>}
    <details><summary>Seasonal method & limitations</summary><p>{forecast.method}</p></details>
  </article>
}
