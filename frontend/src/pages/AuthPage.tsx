import { useState, type FormEvent } from "react";
import {
	Link,
	Navigate,
	useLocation,
	useNavigate,
	useSearchParams,
} from "react-router";
import { authErrorMessage } from "../api/auth";
import { ApiError } from '../api/api'
import EmailCodeSignIn from '../components/EmailCodeSignIn'
import { safeReturnTo } from '../helpers/authNavigation'
import { useAuth } from "../context/authContext";
import { ROUTES } from "../routes";
import '../styles/Account.css'

export default function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const checkoutState = (location.state as { checkoutState?: unknown } | null)?.checkoutState
  const registering = mode === 'sign-up'
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [useCode, setUseCode] = useState(false)
  const verificationPath = `${ROUTES.verifyEmail}?returnTo=${encodeURIComponent(returnTo)}`

  function openVerification(email: string) {
    navigate(verificationPath, { state: { email, checkoutState } })
  }

  if (auth.status === 'loading') return <div className="account-page" role="status">Checking your session…</div>
  if (auth.user) return <Navigate to={returnTo} replace state={checkoutState} />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (registering && form.password !== form.confirmPassword) { setError('Your passwords do not match.'); return }
    if (new TextEncoder().encode(form.password).length > 72) { setError('Your password must be at most 72 UTF-8 bytes.'); return }
    setBusy(true)
    try {
      if (registering) {
        const result = await auth.signUp(form)
        openVerification(result.email)
      } else {
        await auth.signIn(form.email, form.password)
        navigate(returnTo, { replace: true, state: checkoutState })
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EmailNotVerified') openVerification(form.email.trim())
      else setError(authErrorMessage(error))
    }
    finally { setBusy(false) }
  }

  const update = (name: keyof typeof form, value: string) => setForm(current => ({ ...current, [name]: value }))
  const field = (name: keyof typeof form, label: string, type = 'text', autoComplete?: string, required = true) => (
    <label className="account-field" htmlFor={`auth-${name}`}>
      <span>{label}</span>
      <input id={`auth-${name}`} name={name} type={type} value={form[name]} required={required}
        autoComplete={autoComplete} maxLength={name === 'email' ? 255 : name === 'password' || name === 'confirmPassword' ? undefined : 100}
        minLength={registering && name === 'password' ? 8 : undefined}
        onChange={event => update(name, event.target.value)} />
    </label>
  )

  return <section className="account-page auth-page">
    <div className="account-intro">
      <p className="account-eyebrow">Snug Rebel / Your account</p>
      <h1>{registering ? 'Join the rebellion.' : 'Welcome back.'}</h1>
      <p>Keep your bag with you and find your orders in one place.</p>
      <Link to={ROUTES.shop} className="account-text-link">Explore the shop →</Link>
    </div>
    <div className="account-card">
      <h2>{registering ? 'Create an account' : 'Sign in'}</h2>
      <p>{registering ? 'Make yourself at home.' : 'Your next favorite is waiting.'}</p>
      {!registering && useCode ? <EmailCodeSignIn onSignedIn={() => navigate(returnTo, { replace: true, state: checkoutState })} /> : <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {registering && <div className="account-field-row">
            {field('firstName', 'First name', 'text', 'given-name')}
            {field('lastName', 'Last name', 'text', 'family-name')}
          </div>}
          {field('email', 'Email', 'email', 'email')}
          {registering && field('phoneNumber', 'Phone number (optional)', 'tel', 'tel', false)}
          {field('password', 'Password', showPassword ? 'text' : 'password', registering ? 'new-password' : 'current-password')}
          {registering && <p className="account-hint">Use at least 8 characters.</p>}
          {registering && field('confirmPassword', 'Confirm password', showPassword ? 'text' : 'password', 'new-password')}
          <label className="account-checkbox"><input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} /> Show password</label>
          {error && <p className="account-error" role="alert">{error}</p>}
          <button type="submit" className="account-button" disabled={busy}>{busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}</button>
        </fieldset>
      </form>}
      {!registering && <p className="account-switch"><button className="account-text-link" type="button" disabled={busy}
        onClick={() => { setUseCode(current => !current); setError('') }}>
        {useCode ? 'Sign in with a password' : 'Sign in with an email code'}
      </button></p>}
      <p className="account-switch">{registering ? 'Already a member?' : 'New here?'}{' '}
        <Link to={`${registering ? ROUTES.signIn : ROUTES.signUp}?returnTo=${encodeURIComponent(returnTo)}`} state={{ checkoutState }}>
          {registering ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
      <p className="account-switch"><Link to={verificationPath} state={{ email: form.email.trim(), checkoutState }}>Already received a code? Enter verification code</Link></p>
    </div>
  </section>
}
