import { useId, useState, type FormEvent } from 'react'
import { authErrorMessage, requestLoginCode } from '../api/auth'
import { useAuth } from '../context/authContext'

export default function EmailCodeSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const id = useId()
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function send() {
    setBusy(true); setError(''); setMessage('')
    try { setMessage((await requestLoginCode(email)).message); setSent(true); setCode('') }
    catch (error) { setError(authErrorMessage(error)) }
    finally { setBusy(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sent) { await send(); return }
    setBusy(true); setError('')
    try { await auth.signInWithCode(email, code); onSignedIn() }
    catch (error) { setError(authErrorMessage(error)) }
    finally { setBusy(false) }
  }

  return <form onSubmit={submit}>
    <fieldset disabled={busy}>
      <label className="account-field" htmlFor={`${id}-email`}><span>Email</span>
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={255} required
          value={email} readOnly={sent} onChange={event => setEmail(event.target.value)} />
      </label>
      {sent && <>
        <label className="account-field" htmlFor={`${id}-code`}><span>Sign-in code</span>
          <input id={`${id}-code`} name="code" inputMode="numeric" autoComplete="one-time-code" required
            pattern="[0-9]{6}" maxLength={6} placeholder="6-digit code" value={code}
            onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
        </label>
        <p className="account-hint">Use your sign-in code within 10 minutes. Signing in also verifies your email address.</p>
      </>}
      {message && <p className="account-notice" role="status">{message}</p>}
      {error && <p className="account-error" role="alert">{error}</p>}
      <button className="account-button" type="submit">{busy ? 'Please wait…' : sent ? 'Sign in with code' : 'Email me a sign-in code'}</button>
      {sent && <p className="account-switch">
        <button className="account-text-link" type="button" onClick={() => void send()}>Resend code</button>{' · '}
        <button className="account-text-link" type="button" onClick={() => { setSent(false); setCode(''); setMessage(''); setError('') }}>Use another email</button>
      </p>}
    </fieldset>
  </form>
}
