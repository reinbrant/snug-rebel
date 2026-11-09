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
    catch (err) { setError(authErrorMessage(err)) }
    finally { setBusy(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sent) { await send(); return }
    setBusy(true); setError('')
    try { await auth.signInWithCode(email, code); onSignedIn() }
    catch (err) { setError(authErrorMessage(err)) }
    finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="w-full flex flex-col gap-4 font-display">
      <fieldset disabled={busy} className="contents">
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-black ml-1" htmlFor={`${id}-email`}>
            Email
          </label>
          <div className={`relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-4 sm:px-5 border ${error && !sent ? 'border-red-500' : 'border-transparent'}`}>
            <svg className="w-5 h-5 text-[#e60000] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              maxLength={255}
              required
              readOnly={sent}
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="Enter your email"
              className="w-full bg-transparent outline-none ml-3 text-base text-black placeholder-neutral-400 font-medium"
            />
          </div>
        </div>

        {sent && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-black ml-1" htmlFor={`${id}-code`}>
              Sign-in code
            </label>
            <div className={`relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-4 sm:px-5 border ${error ? 'border-red-500' : 'border-transparent'}`}>
              <svg className="w-5 h-5 text-[#e60000] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                id={`${id}-code`}
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-transparent outline-none ml-3 text-base text-black placeholder-neutral-400 font-mono tracking-[0.25em]"
              />
            </div>
            <p className="text-[11px] text-neutral-500 font-bold ml-1">Use within 10 minutes.</p>
          </div>
        )}

        {message && <p className="text-xs text-[#2d8f5b] font-bold text-center" role="status">{message}</p>}
        {error && <p className="text-[11px] text-red-500 font-bold text-center" role="alert">{error}</p>}

        {/* Centered Skewed Button */}
        <div className="relative group cursor-pointer inline-block w-4/5 mx-auto mt-2">
          <div className="absolute inset-0 bg-[#e60000] transform -skew-x-12 translate-x-1.5 translate-y-1.5 transition-all duration-200 ease-out group-hover:translate-x-2 group-hover:translate-y-2 group-active:translate-x-0 group-active:translate-y-0" />
          <button
            type="submit"
            disabled={busy}
            className="relative z-10 w-full px-6 py-4 bg-black text-white font-display font-extrabold text-base sm:text-lg tracking-wider uppercase transform -skew-x-12 transition-all duration-200 group-hover:bg-neutral-900 group-active:bg-black focus:outline-none flex justify-center items-center disabled:opacity-75 cursor-pointer"
          >
            <span className="inline-block transform skew-x-12">
              {busy ? 'WAIT...' : sent ? 'SIGN IN WITH CODE' : 'EMAIL ME A SIGN-IN CODE'}
            </span>
            <svg className="absolute -right-5 top-1/2 -translate-y-1/2 w-8 h-8 text-white transform skew-x-12 drop-shadow-md pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="black" strokeWidth="1" />
            </svg>
          </button>
        </div>

        {sent && (
          <div className="flex justify-center gap-3 text-xs font-bold text-neutral-500 mt-2">
            <button className="hover:text-black underline cursor-pointer transition-colors" type="button" onClick={() => void send()}>Resend code</button>
            <span>·</span>
            <button className="hover:text-black underline cursor-pointer transition-colors" type="button" onClick={() => { setSent(false); setCode(''); setMessage(''); setError('') }}>Use another email</button>
          </div>
        )}
      </fieldset>
    </form>
  )
}