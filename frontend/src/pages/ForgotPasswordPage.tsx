import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { authErrorMessage, requestPasswordReset, resetPassword } from '../api/auth'
import { safeReturnTo } from '../helpers/authNavigation'
import { ROUTES } from '../routes'
import logo from '../assets/snugrebel_logo_black.svg'

export default function ForgotPasswordPage() {
  const location = useLocation()
  const [params] = useSearchParams()
  const state = location.state as { email?: string; checkoutState?: unknown } | null
  const [email, setEmail] = useState(typeof state?.email === 'string' ? state.email : '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [sent, setSent] = useState(false)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const emailInput = useRef<HTMLInputElement>(null)
  const signInPath = `${ROUTES.signIn}?returnTo=${encodeURIComponent(safeReturnTo(params.get('returnTo')))}`

  async function send() {
    if (!emailInput.current?.reportValidity()) return
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await requestPasswordReset(email)
      setSent(true); setCode(''); setMessage(result.message)
    } catch (err) { setError(authErrorMessage(err)) }
    finally { setBusy(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sent) { await send(); return }
    setError(''); setMessage('')
    if (password !== confirmation) { setError('Your passwords do not match.'); return }
    if (new TextEncoder().encode(password).length > 72) {
      setError('Your password must be at most 72 UTF-8 bytes.'); return
    }
    setBusy(true)
    try { setMessage((await resetPassword(email, code, password)).message); setDone(true); setPassword(''); setConfirmation(''); setCode('') }
    catch (err) { setError(authErrorMessage(err)) }
    finally { setBusy(false) }
  }

  return <main className="min-h-[calc(100dvh-var(--nav-h,64px))] grid place-items-center bg-white px-6 py-12 font-display">
    <section className="w-full max-w-md">
      <img src={logo} alt="Snug Rebel" className="mx-auto mb-8 w-48" />
      <h1 className="mb-4 text-3xl font-black uppercase">{done ? 'Password updated' : 'Forgot password?'}</h1>
      {!done && <>
        <p className="mb-6 text-sm text-neutral-600">{sent ? 'Enter the six-digit code from your email and choose a new password. The code expires in 10 minutes.' : 'Enter your account email to receive a password reset code.'}</p>
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <label className="account-field" htmlFor="reset-email"><span>Email</span>
              <input ref={emailInput} id="reset-email" type="email" autoComplete="email" required maxLength={255} value={email}
                onChange={event => { setEmail(event.target.value); setSent(false); setCode(''); setMessage(''); setError('') }} />
            </label>
            {sent && <>
              <label className="account-field" htmlFor="reset-code"><span>Reset code</span>
                <input id="reset-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required
                  value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
              </label>
              <label className="account-field" htmlFor="reset-password"><span>New password</span>
                <input id="reset-password" type="password" autoComplete="new-password" minLength={8} required
                  value={password} onChange={event => setPassword(event.target.value)} />
              </label>
              <label className="account-field" htmlFor="reset-confirm"><span>Confirm new password</span>
                <input id="reset-confirm" type="password" autoComplete="new-password" minLength={8} required
                  value={confirmation} onChange={event => setConfirmation(event.target.value)} />
              </label>
              <p className="account-hint">Use at least 8 characters.</p>
            </>}
            <button type="submit" className="account-button">{busy ? 'Please wait…' : sent ? 'Reset password' : 'Send reset code'}</button>
            {sent && <p className="account-switch"><button type="button" className="account-text-link" onClick={() => void send()}>Resend reset code</button></p>}
          </fieldset>
        </form>
      </>}
      {message && <p className="account-notice" role="status">{message}</p>}
      {error && <p className="account-error" role="alert">{error}</p>}
      <p className="account-switch"><Link className="account-text-link" to={signInPath} state={{ checkoutState: state?.checkoutState }}>Back to sign in</Link></p>
    </section>
  </main>
}
