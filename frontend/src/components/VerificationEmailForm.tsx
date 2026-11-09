import { useId, useState, type FormEvent } from 'react'
import { authErrorMessage, resendVerification, verifyEmailCode } from '../api/auth'

export default function VerificationEmailForm({ initialEmail = '' }: { initialEmail?: string }) {
  const id = useId()
  const [email, setEmail] = useState(initialEmail)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [verified, setVerified] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try { setMessage((await verifyEmailCode(email, code)).message); setVerified(true) }
    catch (error) { setError(authErrorMessage(error)) }
    finally { setBusy(false) }
  }

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try { setMessage((await resendVerification(email)).message); setCode('') }
    catch (error) { setError(authErrorMessage(error)) }
    finally { setBusy(false) }
  }

  if (verified) return <p className="account-notice" role="status">{message}</p>

  return <>
  <form id={`${id}-resend`} onSubmit={resend}>
    <fieldset disabled={busy}>
      <label className="account-field" htmlFor={id}><span>Email</span>
        <input id={id} name="email" type="email" autoComplete="email" required maxLength={255}
          value={email} onChange={event => { setEmail(event.target.value); setCode(''); setMessage(''); setError('') }} />
      </label>
    </fieldset>
  </form>
  <form onSubmit={submit}>
    <fieldset disabled={busy}>
      <label className="account-field" htmlFor={`${id}-code`}><span>Verification code</span>
        <input id={`${id}-code`} name="code" inputMode="numeric" autoComplete="one-time-code" required
          pattern="[0-9]{6}" maxLength={6} placeholder="6-digit code" value={code}
          onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
      </label>
      <p className="account-hint">Enter the six-digit code from your email. It expires in 10 minutes.</p>
      <button className="account-button" type="submit" disabled={busy || !email}>{busy ? 'Please wait…' : 'Verify email with code'}</button>
    </fieldset>
  </form>
  {message && <p className="account-notice" role="status">{message}</p>}
  {error && <p className="account-error" role="alert">{error}</p>}
  <p className="account-switch"><button className="account-text-link" form={`${id}-resend`} type="submit" disabled={busy}>Resend verification email</button></p>
  </>
}
