import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { authErrorMessage, verifyEmail } from '../api/auth'
import VerificationEmailForm from '../components/VerificationEmailForm'
import { ROUTES } from '../routes'
import '../styles/Account.css'

export default function VerifyEmailPage() {
  const location = useLocation()
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') ?? '')
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const validToken = /^[A-Za-z0-9_-]{43}$/.test(token)

  useEffect(() => {
    // Keep secrets out of the visible URL, history entry, and referrers.
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }, [])

  async function confirm() {
    setBusy(true); setError('')
    try { await verifyEmail(token); setVerified(true) }
    catch (error) { setError(authErrorMessage(error)) }
    finally { setBusy(false) }
  }

  return <section className="account-page auth-page">
    <div className="account-intro"><p className="account-eyebrow">Snug Rebel / Your account</p>
      <h1>One last step.</h1><p>Confirm your email address to finish creating your account.</p>
    </div>
    <div className="account-card">
      <h2>{verified ? 'Email verified' : 'Verify your email'}</h2>
      {verified ? <>
        <p role="status">Your email is verified. Sign in to pick up where you left off.</p>
        <Link to={ROUTES.signIn} className="account-button">Continue to sign in</Link>
      </> : <>
        {validToken ? <>
          <p>Confirm below to verify your email. This link can be used once and expires after one hour.</p>
          <button className="account-button" type="button" disabled={busy} onClick={() => void confirm()}>{busy ? 'Verifying…' : 'Verify my email'}</button>
        </> : <p>Enter the code from your verification email, or request another email below.</p>}
        {error && <p className="account-error" role="alert">{error}</p>}
        <h3 className="verification-resend-heading">Verify with an email code</h3>
        <VerificationEmailForm />
        <p className="account-switch"><Link to={ROUTES.signIn}>Back to sign in</Link></p>
      </>}
    </div>
  </section>
}
