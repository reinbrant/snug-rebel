import { useEffect, useState, type FormEvent } from 'react'
import { requestJson } from '../lib/config'

type AuditEntry = {
  id: string; action: string; actionType: string; description: string; actorName: string; actorRole: string;
  actorId: string | null; entityType: string | null; entityId: string | null; createdAt: string;
  changes: string | null; requestId: string | null; ipAddress: string | null;
}
type Result = { items: AuditEntry[]; total: number; page: number; pageSize: number; actionTypes: string[] }
const initialFilters = { search: '', actionType: '', from: '', to: '' }

export function AuditLogPage() {
  const [draft, setDraft] = useState(initialFilters)
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setResult(null)
    const params = new URLSearchParams({ page: String(page), pageSize: '25' })
    if (filters.search) params.set('search', filters.search)
    if (filters.actionType) params.set('actionType', filters.actionType)
    // Date controls represent Philippine calendar dates. API upper bound is exclusive.
    if (filters.from) params.set('from', `${filters.from}T00:00:00+08:00`)
    if (filters.to) params.set('to', new Date(Date.parse(`${filters.to}T00:00:00+08:00`) + 86400000).toISOString())
    requestJson<Result>(`/api/Audit?${params}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setResult(data) })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load audit logs.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [filters, page, refresh])

  function apply(event: FormEvent) { event.preventDefault(); setPage(1); setFilters({ ...draft }) }

  return <section>
    <div className="page-header"><div><h2>Audit log</h2><p>Who changed what, when, and how. Times shown in Philippine time.</p></div>
      <button className="secondary-button" onClick={() => setRefresh(value => value + 1)} disabled={loading}>Refresh</button></div>
    <form onSubmit={apply} className="audit-filters">
      <label>Search actor, action or record<input maxLength={200} value={draft.search} onChange={e => setDraft({ ...draft, search: e.target.value })} /></label>
      <label>Action type<select aria-label="Action type" value={draft.actionType} onChange={e => setDraft({ ...draft, actionType: e.target.value })}>
        <option value="">All types</option>{Array.from(new Set([...(result?.actionTypes ?? []), draft.actionType])).filter(Boolean).map(type => <option key={type}>{type}</option>)}
      </select></label>
      <label>From<input type="date" value={draft.from} max={draft.to || undefined} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
      <label>Through<input type="date" value={draft.to} min={draft.from || undefined} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
      <button className="primary-button" disabled={loading}>Apply filters</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {loading && <p role="status">Loading audit log…</p>}
    {result && <>
      <p>{result.total} matching events</p>
      <div className="table-wrap"><table><thead><tr><th>Time (PHT)</th><th>Actor</th><th>Action type</th><th>Action and description</th><th>Record</th><th>Details</th></tr></thead>
        <tbody>{result.items.map(entry => <tr key={entry.id}>
          <td>{new Date(entry.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td>
          <td><strong>{entry.actorName}</strong><div>{entry.actorRole}</div></td>
          <td>{entry.actionType}</td><td className="audit-description"><strong>{entry.action.replaceAll('_', ' ')}</strong><p>{entry.description || 'No additional details were captured for this historical event.'}</p></td>
          <td>{entry.entityType || '—'}<div className="audit-id">{entry.entityId}</div></td>
          <td><details><summary>View details</summary><p>Actor ID: {entry.actorId || '—'}</p><p>Request: {entry.requestId || 'Not captured'}</p><p>IP: {entry.ipAddress || 'Not captured'}</p>
            {entry.changes && <pre>{prettyChanges(entry.changes)}</pre>}</details></td>
        </tr>)}</tbody></table></div>
      {result.items.length === 0 && <p>No audit events match these filters.</p>}
      <div className="audit-pagination"><button className="secondary-button" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page} of {Math.max(1, Math.ceil(result.total / result.pageSize))}</span>
        <button className="secondary-button" disabled={page * result.pageSize >= result.total || loading} onClick={() => setPage(page + 1)}>Next</button></div>
    </>}
  </section>
}

function prettyChanges(changes: string) {
  try { return JSON.stringify(JSON.parse(changes), null, 2) } catch { return changes }
}
