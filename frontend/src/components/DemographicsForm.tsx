import { useEffect, useState } from 'react'
import { apiFetch } from '../api/api'
import { authErrorMessage } from '../api/auth'

type Answers = { shareForAnalytics: boolean; ageRange: string | null; gender: string | null }
const empty: Answers = { shareForAnalytics: false, ageRange: null, gender: null }

export default function DemographicsForm() {
  const [answers, setAnswers] = useState<Answers>(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<Answers>('/Account/demographics', { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) { setAnswers(value); setLoadError('') } })
      .catch(reason => { if (!controller.signal.aborted) setLoadError(authErrorMessage(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])

  return <section className="account-demographics" aria-labelledby="demographics-heading">
    <h2 id="demographics-heading">About you <span>(optional)</span></h2>
    <p className="account-hint">Share an age range and/or gender to help us understand our customers. The admin dashboard shows grouped totals. You can change or remove your answers here at any time.</p>
    {loading ? <p role="status">Loading your preferences…</p> : loadError ? <><p className="account-error" role="alert">{loadError}</p><button type="button" className="account-button account-button-outline" onClick={() => { setLoading(true); setAttempt(value => value + 1) }}>Retry preferences</button></> :
      <form onSubmit={async event => {
        event.preventDefault(); setSaving(true); setError(''); setNotice('')
        try {
          const result = await apiFetch<Answers>('/Account/demographics', { method: 'PUT', body: JSON.stringify(answers) })
          setAnswers(result)
          setNotice(result.shareForAnalytics ? 'Your optional details have been saved.' : 'Sharing is off. Your demographic answers have been removed.')
        } catch (reason) { setError(authErrorMessage(reason)) }
        finally { setSaving(false) }
      }}>
        <fieldset disabled={saving}>
          <label className="account-checkbox"><input type="checkbox" checked={answers.shareForAnalytics} onChange={event => { setNotice(''); setAnswers(value => ({ ...value, shareForAnalytics: event.target.checked })) }} />Share my answers for store analytics</label>
          <label className="account-field">Age range<select disabled={!answers.shareForAnalytics} value={answers.ageRange ?? ''} onChange={event => { setNotice(''); setAnswers(value => ({ ...value, ageRange: event.target.value || null })) }}>
            <option value="">Prefer not to say</option><option value="under18">Under 18</option><option value="18-24">18–24</option><option value="25-34">25–34</option><option value="35-44">35–44</option><option value="45-54">45–54</option><option value="55+">55+</option>
          </select></label>
          <label className="account-field">Gender<select disabled={!answers.shareForAnalytics} value={answers.gender ?? ''} onChange={event => { setNotice(''); setAnswers(value => ({ ...value, gender: event.target.value || null })) }}>
            <option value="">Prefer not to say</option><option value="woman">Woman</option><option value="man">Man</option><option value="nonbinary">Non-binary</option><option value="another">Another identity</option>
          </select></label>
          {error && <p className="account-error" role="alert">{error}</p>}
          {notice && <p className="account-notice" role="status">{notice}</p>}
          <button type="submit" className="account-button" disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button>
        </fieldset>
      </form>}
  </section>
}
