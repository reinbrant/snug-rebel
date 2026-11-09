import { useState, type FormEvent, type UIEvent } from "react";
import {
	Link,
	Navigate,
	useLocation,
	useNavigate,
	useSearchParams,
} from "react-router";
import { authErrorMessage } from "../api/auth";
import { ApiError } from '../api/api';
import EmailCodeSignIn from '../components/EmailCodeSignIn';
import { safeReturnTo } from '../helpers/authNavigation';
import { useAuth } from "../context/authContext";
import { ROUTES } from "../routes";

import sign_up_img from '../assets/sign_up_img.jpg';
import snugrebel_logo_black from '../assets/snugrebel_logo_black.svg';

export default function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));
  const checkoutState = (location.state as { checkoutState?: unknown } | null)?.checkoutState;
  const registering = mode === 'sign-up';

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [useCode, setUseCode] = useState(false);
  
  // Terms and Conditions State
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const verificationPath = `${ROUTES.verifyEmail}?returnTo=${encodeURIComponent(returnTo)}`;

  function openVerification(email: string) {
    navigate(verificationPath, { state: { email, checkoutState } });
  }

  const handleTermsScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (Math.ceil(scrollTop + clientHeight) >= scrollHeight - 15) {
      setHasScrolledToBottom(true);
    }
  };

  if (auth.status === 'loading') return <div className="min-h-screen grid place-items-center font-display" role="status">Checking your session…</div>;
  if (auth.user) return <Navigate to={returnTo} replace state={checkoutState} />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); 
    setError('');
    
    if (registering && form.password !== form.confirmPassword) { 
        setError('Your passwords do not match.'); 
        return; 
    }
    if (registering && !termsAccepted) {
        setError('You must read and agree to the Terms and Conditions.');
        return;
    }
    if (new TextEncoder().encode(form.password).length > 72) { 
        setError('Your password must be at most 72 UTF-8 bytes.'); 
        return; 
    }
    
    setBusy(true);
    try {
      if (registering) {
        const result = await auth.signUp(form);
        openVerification(result.email);
      } else {
        await auth.signIn(form.email, form.password);
        navigate(returnTo, { replace: true, state: checkoutState });
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EmailNotVerified') {
          openVerification(form.email.trim());
      } else {
          setError(authErrorMessage(err));
      }
    }
    finally { setBusy(false); }
  }

  const update = (name: keyof typeof form, value: string) => setForm(current => ({ ...current, [name]: value }));

  return (
    <div className="h-[100dvh] w-full flex flex-col lg:flex-row bg-white font-display overflow-hidden select-none">
      
      {/* Left Side: Campaign Image with Dark Gradient & Raised Flavor Text */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#111] flex-col justify-center p-12 xl:p-16 shrink-0">
        <img 
          src={sign_up_img} 
          alt={registering ? "Sign Up Campaign" : "Log In Campaign"} 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
        
        {/* Raised Flavor Text Content */}
        <div className="relative z-10 w-full max-w-lg select-text my-auto pt-16">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-neutral-300 mb-3">
            Snug Rebel / Your account
          </p>
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            {registering ? 'Join the rebellion.' : 'Welcome back.'}
          </h1>
          <p className="text-base xl:text-lg text-neutral-300 mb-8 leading-relaxed">
            Keep your bag with you and find your orders in one place.
          </p>
          <Link 
            to={ROUTES.shop} 
            className="text-sm font-bold uppercase tracking-wider text-white underline decoration-2 underline-offset-4 hover:text-[#e60000] transition-colors"
          >
            Explore the shop →
          </Link>
        </div>
      </div>

      {/* Right Side: Form Container (Single-viewport / Non-scrollable) */}
      <div className="w-full lg:w-1/2 flex flex-col px-6 py-6 sm:px-12 h-full justify-center items-center overflow-hidden">
        
        <div className="w-full max-w-md flex flex-col items-center">
          <h1 className="lg:hidden text-2xl font-extrabold text-black mb-3 tracking-wide text-center">
            {registering ? 'Create Your Account' : 'Log In'}
          </h1>
          
          {/* Bigger Logo */}
          <img 
            src={snugrebel_logo_black} 
            alt="Snug Rebel Logo" 
            className="w-44 lg:w-56 object-contain mx-auto mb-6 pointer-events-none"
          />
        </div>

        <div className="w-full max-w-md">
          {!registering && useCode ? (
            <EmailCodeSignIn onSignedIn={() => navigate(returnTo, { replace: true, state: checkoutState })} />
          ) : (
            <form onSubmit={submit} className="w-full flex flex-col gap-3.5">
              
              {/* Row 1: Name Fields (Sign Up Only) */}
              {registering && (
                <div className="flex flex-row gap-3.5">
                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-xs font-bold text-black ml-1">First Name</label>
                    <div className="relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-3.5 border border-transparent">
                      <input 
                        type="text" name="firstName" value={form.firstName} required
                        onChange={e => update('firstName', e.target.value)} placeholder="First name"
                        className="w-full bg-transparent outline-none text-base text-black placeholder-neutral-400 font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-xs font-bold text-black ml-1">Last Name</label>
                    <div className="relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-3.5 border border-transparent">
                      <input 
                        type="text" name="lastName" value={form.lastName} required
                        onChange={e => update('lastName', e.target.value)} placeholder="Last name"
                        className="w-full bg-transparent outline-none text-base text-black placeholder-neutral-400 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Row 2: Email & Phone */}
              <div className={`flex ${registering ? 'flex-row' : 'flex-col'} gap-3.5`}>
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-xs font-bold text-black ml-1">Email</label>
                  <div className={`relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-3.5 border ${error.includes('mail') ? 'border-red-500' : 'border-transparent'}`}>
                    {!registering && (
                      <svg className="w-5 h-5 text-[#e60000] shrink-0 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </svg>
                    )}
                    <input 
                      type="email" name="email" required maxLength={255} value={form.email}
                      onChange={e => update('email', e.target.value)} placeholder="Email address"
                      className="w-full bg-transparent outline-none text-base text-black placeholder-neutral-400 font-medium"
                    />
                  </div>
                </div>
                {registering && (
                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-xs font-bold text-black ml-1">Phone Number</label>
                    <div className="relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-3.5 border border-transparent">
                      <input 
                        type="tel" name="phoneNumber" maxLength={100} value={form.phoneNumber}
                        onChange={e => update('phoneNumber', e.target.value)} placeholder="Optional"
                        className="w-full bg-transparent outline-none text-base text-black placeholder-neutral-400 font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Passwords */}
              <div className={`flex ${registering ? 'flex-row' : 'flex-col'} gap-3.5`}>
                <div className="flex flex-col gap-1 w-full">
                  <label className="text-xs font-bold text-black ml-1">Password</label>
                  <div className={`relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-3.5 border ${error.includes('assword') ? 'border-red-500' : 'border-transparent'}`}>
                    {!registering && (
                      <svg className="w-5 h-5 text-[#e60000] shrink-0 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                    )}
                    <input 
                      type={showPassword ? "text" : "password"} name="password" required minLength={registering ? 8 : undefined}
                      value={form.password} onChange={e => update('password', e.target.value)} placeholder={registering ? "Create password" : "Enter password"}
                      className="w-full bg-transparent outline-none text-base text-black placeholder-neutral-400 font-medium"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-neutral-400 hover:text-black shrink-0 focus:outline-none ml-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    </button>
                  </div>
                </div>

                {registering && (
                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-xs font-bold text-black ml-1">Confirm Password</label>
                    <div className={`relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-3.5 border ${error.includes('match') ? 'border-red-500' : 'border-transparent'}`}>
                      <input 
                        type={showConfirmPassword ? "text" : "password"} name="confirmPassword" required
                        value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} placeholder="Confirm Password"
                        className="w-full bg-transparent outline-none text-base text-black placeholder-neutral-400 font-medium"
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-neutral-400 hover:text-black shrink-0 focus:outline-none ml-2">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* T&C Checkbox (Sign Up Only) */}
              {registering && (
                <div className="mt-1 flex items-center justify-center">
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={termsAccepted}
                        onChange={(e) => {
                           if (!hasScrolledToBottom && e.target.checked) {
                               e.preventDefault();
                               setShowTermsModal(true);
                           } else {
                               setTermsAccepted(e.target.checked);
                           }
                        }}
                        className="w-4 h-4 accent-[#e60000] cursor-pointer" 
                      />
                      <span className="text-xs font-bold text-neutral-600">
                         I agree to the <button type="button" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }} className="text-[#e60000] hover:underline underline-offset-2">Terms & Privacy Policy</button>
                      </span>
                   </label>
                </div>
              )}

              {error && <span className="text-xs text-red-500 font-bold w-full text-center leading-tight">{error}</span>}

              {/* Main Submit Action Button */}
              <div className="relative group cursor-pointer inline-block w-4/5 mx-auto mt-2">
                <div className="absolute inset-0 bg-[#e60000] transform -skew-x-12 translate-x-1.5 translate-y-1.5 transition-all duration-200 ease-out group-hover:translate-x-2 group-hover:translate-y-2 group-active:translate-x-0 group-active:translate-y-0" />
                <button 
                  type="submit"
                  disabled={busy}
                  className="relative z-10 w-full px-6 py-4 bg-black text-white font-display font-extrabold text-lg tracking-wider uppercase transform -skew-x-12 transition-all duration-200 group-hover:bg-neutral-900 group-active:bg-black focus:outline-none flex justify-center items-center disabled:opacity-75 cursor-pointer"
                >
                  <span className="inline-block transform skew-x-12">{busy ? 'WAIT...' : registering ? 'CONFIRM' : 'LOG IN'}</span>
                  <svg className="absolute -right-5 top-1/2 -translate-y-1/2 w-8 h-8 text-white transform skew-x-12 drop-shadow-md pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="black" strokeWidth="1" />
                  </svg>
                </button>
              </div>

            </form>
          )}

          {/* Bottom Links (Email Code Toggle Reverted to Text) */}
          <div className="w-full flex flex-col gap-3 items-center mt-5 text-center">
            
            <p className="text-xs lg:text-sm font-bold text-black">
              {registering ? 'Already have an account?' : "Don't have an account?"} {' '}
              <Link 
                to={`${registering ? ROUTES.signIn : ROUTES.signUp}?returnTo=${encodeURIComponent(returnTo)}`} 
                state={{ checkoutState }} 
                className="text-[#e60000] hover:underline"
              >
                {registering ? 'Log In here' : 'Sign Up here'}
              </Link>
            </p>

            {!registering && (
              <Link to={`${ROUTES.forgotPassword}?returnTo=${encodeURIComponent(returnTo)}`}
                state={{ email: form.email.trim(), checkoutState }}
                className="text-xs lg:text-sm font-bold text-[#e60000] hover:underline">
                Forgot password?
              </Link>
            )}

            {!registering && (
              <button 
                type="button" 
                disabled={busy} 
                onClick={() => { setUseCode(current => !current); setError(''); }}
                className="text-xs lg:text-sm font-bold text-neutral-500 hover:text-black hover:underline transition-colors cursor-pointer"
              >
                {useCode ? 'Sign in with a password instead' : 'Sign in with an email code instead'}
              </button>
            )}

            <Link 
              to={verificationPath} 
              state={{ email: form.email.trim(), checkoutState }}
              className="text-xs lg:text-sm font-bold text-neutral-500 hover:text-black hover:underline transition-colors"
            >
              Already received a code? Enter verification code
            </Link>
            
          </div>

        </div>
      </div>

      {/* Terms and Conditions / Privacy Policy Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
           <div className="bg-white w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden shadow-[8px_8px_0_var(--color-brand-red-dark)] border-4 border-black font-display">
              
              <div className="p-4 bg-neutral-100 border-b-2 border-black flex justify-between items-center shrink-0">
                 <h2 className="font-extrabold uppercase tracking-wide text-black text-sm">Terms & Privacy Policy</h2>
                 <button onClick={() => setShowTermsModal(false)} className="text-neutral-500 hover:text-brand-red transition-colors">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                     </svg>
                 </button>
              </div>
              
              <div onScroll={handleTermsScroll} className="p-6 overflow-y-auto flex-1 text-[13px] text-neutral-700 space-y-5 leading-relaxed font-medium">
                 <div>
                    <h3 className="font-extrabold text-black uppercase tracking-wide mb-2">1. General Conditions</h3>
                    <p>Welcome to Snug Rebel. By accessing and registering an account on our website, you agree to be bound by these Terms and Conditions. Snug Rebel operates primarily within Metro Manila, Philippines. We reserve the right to refuse service, terminate accounts, or cancel orders at our sole discretion if we suspect fraudulent behavior.</p>
                 </div>
                 <div>
                    <h3 className="font-extrabold text-black uppercase tracking-wide mb-2">2. Pricing, Payments & Orders</h3>
                    <p>All product prices are stated in Philippine Peso (PHP) and are subject to change without prior notice. We accept payments via GCash, Maya, Bank Transfer, and Cash on Delivery (COD). By confirming an order, you agree to pay the total amount including shipping fees. Unpaid orders (except COD) will be automatically cancelled after 24 hours.</p>
                 </div>
                 <div>
                    <h3 className="font-extrabold text-black uppercase tracking-wide mb-2">3. Shipping & Delivery</h3>
                    <p>We fulfill orders via local courier partners (e.g., J&T Express, LBC). Standard delivery within Metro Manila takes 1-3 business days, while provincial shipping takes 3-7 business days. Snug Rebel is not liable for delays caused by severe weather (typhoons), inaccurate shipping information, or third-party courier handling issues.</p>
                 </div>
                 <div>
                    <h3 className="font-extrabold text-black uppercase tracking-wide mb-2">4. Returns & Exchanges (DTI Compliance)</h3>
                    <p>In compliance with the Department of Trade and Industry (DTI) regulations (R.A. 7394 - Consumer Act of the Philippines), we accept returns strictly for defective or damaged goods within seven (7) days of receipt. We do not offer refunds or exchanges for "change of mind." Items must be unwashed, unworn, and have original tags attached.</p>
                 </div>
                 <div>
                    <h3 className="font-extrabold text-black uppercase tracking-wide mb-2">5. Privacy Policy & Data Collection</h3>
                    <p>Your privacy is paramount. In accordance with the Data Privacy Act of 2012 (Republic Act No. 10173), we collect only necessary personal information (Name, Email, Phone Number, and Delivery Address) solely for the purpose of order fulfillment and account management. We implement security protocols to protect your data and do not sell or share your personal information with unauthorized third-party marketers.</p>
                 </div>
                 <div>
                    <h3 className="font-extrabold text-black uppercase tracking-wide mb-2">6. Governing Law</h3>
                    <p>These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts located in the City of Manila.</p>
                 </div>
              </div>
              
              <div className="p-4 bg-neutral-100 border-t-2 border-black flex flex-col sm:flex-row justify-end gap-3 items-center shrink-0">
                 {!hasScrolledToBottom && (
                    <span className="text-[10px] font-extrabold text-brand-red uppercase tracking-wide sm:mr-auto text-center">
                       Read to the bottom to agree
                    </span>
                 )}
                 <button onClick={() => setShowTermsModal(false)} className="w-full sm:w-auto px-5 py-2.5 font-bold text-neutral-600 hover:text-black hover:bg-neutral-200 transition-colors text-sm rounded-xl">
                     Cancel
                 </button>
                 <button 
                    disabled={!hasScrolledToBottom} 
                    onClick={() => { setTermsAccepted(true); setShowTermsModal(false); }} 
                    className="w-full sm:w-auto px-8 py-2.5 bg-black text-white font-extrabold text-sm uppercase tracking-wider rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-red transition-colors"
                 >
                     I Agree
                 </button>
              </div>

           </div>
        </div>
      )}

    </div>
  );
}
