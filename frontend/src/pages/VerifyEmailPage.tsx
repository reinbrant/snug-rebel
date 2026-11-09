import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { authErrorMessage, verifyEmail } from '../api/auth'
import VerificationEmailForm from '../components/VerificationEmailForm'
import { ROUTES } from '../routes'
import { safeReturnTo } from '../helpers/authNavigation'

import sign_up_img from '../assets/sign_up_img.jpg';
import snugrebel_logo_black from '../assets/snugrebel_logo_black.svg';

export default function VerifyEmailPage() {
  const location = useLocation()
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const state = location.state as { email?: string; checkoutState?: unknown } | null
  const initialEmail = typeof state?.email === 'string' ? state.email : ''
  const signInPath = `${ROUTES.signIn}?returnTo=${encodeURIComponent(returnTo)}`
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') ?? '')
  const [busy, setBusy] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const validToken = /^[A-Za-z0-9_-]{43}$/.test(token)

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }, [])

  async function confirm() {
    setBusy(true); setError('')
    try { await verifyEmail(token); setVerified(true) }
    catch (err) { setError(authErrorMessage(err)) }
    finally { setBusy(false) }
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col lg:flex-row bg-white font-display overflow-hidden select-none">
      
      {/* Left Side: Campaign Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#111] flex-col justify-center p-10 xl:p-14 shrink-0">
        <img 
          src={sign_up_img} 
          alt="Verify Account Campaign" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
        
        <div className="relative z-10 w-full max-w-lg select-text mb-12">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-neutral-300 mb-2">
            Snug Rebel / Your account
          </p>
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
            One last step.
          </h1>
          <p className="text-sm xl:text-base text-neutral-300 mb-6 leading-relaxed">
            Confirm your email address to finish creating your account.
          </p>
        </div>
      </div>

      {/* Right Side: Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col px-6 py-4 sm:px-10 h-full justify-center items-center overflow-hidden">
        
        <div className="w-full max-w-md flex flex-col items-center">
          <h1 className="lg:hidden text-2xl font-extrabold text-black mb-3 tracking-wide text-center">
            {verified ? 'Email Verified' : 'Enter Verification Code'}
          </h1>
          
          <img 
            src={snugrebel_logo_black} 
            alt="Snug Rebel Logo" 
            className="w-40 lg:w-52 object-contain mx-auto mb-8 pointer-events-none"
          />
        </div>

        <div className="w-full max-w-md py-1">
          {verified ? (
            <div className="flex flex-col gap-6 text-center">
              <p className="text-base font-bold text-[#2d8f5b]" role="status">
                Your email is verified. Sign in to pick up where you left off.
              </p>
              
              <div className="relative group cursor-pointer inline-block w-4/5 mx-auto mt-2">
                <div className="absolute inset-0 bg-[#e60000] transform -skew-x-12 translate-x-1.5 translate-y-1.5 transition-all duration-200 ease-out group-hover:translate-x-2 group-hover:translate-y-2 group-active:translate-x-0 group-active:translate-y-0" />
                <Link 
                  to={signInPath} 
                  state={{ checkoutState: state?.checkoutState }}
                  className="relative z-10 w-full px-6 py-4 bg-black text-white font-display font-extrabold text-base sm:text-lg tracking-wider uppercase transform -skew-x-12 transition-all duration-200 group-hover:bg-neutral-900 group-active:bg-black focus:outline-none flex justify-center items-center disabled:opacity-75 cursor-pointer"
                >
                  <span className="inline-block transform skew-x-12">CONTINUE TO SIGN IN</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 text-center">
              {validToken ? (
                <>
                  <p className="text-sm font-bold text-neutral-600 mb-4">
                    Confirm below to verify your email. This link can be used once and expires after one hour.
                  </p>

                  {error && <p className="text-[11px] text-red-500 font-bold leading-tight" role="alert">{error}</p>}

                  <div className="relative group cursor-pointer inline-block w-4/5 mx-auto mb-6">
                    <div className="absolute inset-0 bg-[#e60000] transform -skew-x-12 translate-x-1.5 translate-y-1.5 transition-all duration-200 ease-out group-hover:translate-x-2 group-hover:translate-y-2 group-active:translate-x-0 group-active:translate-y-0" />
                    <button 
                      type="button"
                      disabled={busy}
                      onClick={() => void confirm()}
                      className="relative z-10 w-full px-6 py-4 bg-black text-white font-display font-extrabold text-base sm:text-lg tracking-wider uppercase transform -skew-x-12 transition-all duration-200 group-hover:bg-neutral-900 group-active:bg-black focus:outline-none flex justify-center items-center disabled:opacity-75 cursor-pointer"
                    >
                      <span className="inline-block transform skew-x-12">{busy ? 'VERIFYING...' : 'VERIFY MY EMAIL'}</span>
                      <svg className="absolute -right-5 top-1/2 -translate-y-1/2 w-8 h-8 text-white transform skew-x-12 drop-shadow-md pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="black" strokeWidth="1" />
                      </svg>
                    </button>
                  </div>
                  
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest my-2">Or enter your email code</h3>
                </>
              ) : (
                <p className="text-sm font-bold text-neutral-600 mb-2">
                  Check your inbox and spam folder for the six-digit code. Enter it below to verify your account.
                </p>
              )}
              
              <VerificationEmailForm initialEmail={initialEmail} onVerified={() => setVerified(true)} />
            </div>
          )}
        </div>

        {!verified && (
          <div className="w-full flex flex-col gap-2 items-center mt-8 text-center">
            <Link 
              to={signInPath} 
              state={{ checkoutState: state?.checkoutState }}
              className="text-[11px] sm:text-xs font-bold text-neutral-500 hover:text-black hover:underline transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}