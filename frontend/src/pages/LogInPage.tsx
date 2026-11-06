import { useState } from 'react';
import snugrebel_logo_black from '../assets/snugrebel_logo_black.svg';
import sign_up_img from '../assets/sign_up_img.jpg';

export default function LogInPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Login submitted successfully', formData);
      // Add authentication logic here
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-display overflow-hidden">
      
      {/* Left Side: Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[#111]">
        <img 
          src={sign_up_img} 
          alt="Log In Campaign" 
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Right Side: Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center mt-12 lg:mt-0">
          
          <h1 className="text-2xl lg:text-3xl font-extrabold text-black mb-4 tracking-wide">Log In</h1>
          
          <img 
            src={snugrebel_logo_black} 
            alt="Snug Rebel Logo" 
            className="w-48 lg:w-64 object-contain mb-8 lg:mb-12 pointer-events-none"
          />

          {/* Changed gap-4 to gap-5 to match Sign Up page spacing */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
            
            {/* Email Field */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-black ml-1">Email</label>
              <div className={`relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-3 border ${errors.email ? 'border-red-500' : 'border-transparent'}`}>
                <svg className="w-5 h-5 text-[#e60000] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full bg-transparent outline-none ml-3 text-sm text-black placeholder-neutral-400"
                />
              </div>
              {errors.email && <span className="text-[10px] text-red-500 ml-1 font-bold">{errors.email}</span>}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-black ml-1">Password</label>
              <div className={`relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-3 border ${errors.password ? 'border-red-500' : 'border-transparent'}`}>
                <svg className="w-5 h-5 text-[#e60000] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full bg-transparent outline-none mx-3 text-sm text-black placeholder-neutral-400"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-neutral-400 hover:text-black shrink-0 focus:outline-none">
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                  )}
                </button>
              </div>
              {errors.password && <span className="text-[10px] text-red-500 ml-1 font-bold">{errors.password}</span>}
              
              {/* Forgot Password Link */}
              <div className="w-full flex justify-end mt-1">
                <a href="#" className="text-[10px] font-bold text-[#e60000] hover:underline">Forgot password</a>
              </div>
            </div>

            {/* Custom Submit Button */}
            <div className="relative group cursor-pointer inline-block w-4/5 mx-auto mt-4">
              <div className="absolute inset-0 bg-[#e60000] transform -skew-x-12 translate-x-2 translate-y-2 transition-all duration-200 ease-out group-hover:translate-x-3 group-hover:translate-y-3 group-active:translate-x-0 group-active:translate-y-0" />
              <button 
                type="submit"
                className="relative z-10 w-full px-8 py-3 bg-black text-white font-display font-extrabold text-lg tracking-wider uppercase transform -skew-x-12 transition-all duration-200 group-hover:bg-neutral-900 group-active:bg-black focus:outline-none flex justify-center items-center"
              >
                <span className="inline-block transform skew-x-12">LOG IN</span>
                <svg className="absolute -right-6 top-1/2 -translate-y-1/2 w-10 h-10 text-white transform skew-x-12 drop-shadow-md pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="black" strokeWidth="1" />
                </svg>
              </button>
            </div>

          </form>

          {/* Social Login Divider */}
          <div className="flex items-center w-full my-6 opacity-70">
            <hr className="flex-grow border-neutral-300" />
            <span className="px-3 text-xs text-neutral-400 font-bold">You can Connect with</span>
            <hr className="flex-grow border-neutral-300" />
          </div>

          {/* Social Icons */}
          <div className="flex items-center justify-center gap-6 mb-8">
            {/* Facebook */}
            <button className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>
            {/* Google */}
            <button className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:scale-110 transition-transform">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </button>
            {/* Apple */}
            <button className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.68-2.05.8-3.08.8-1.09 0-2.14-.14-3.08-.8-1.05-.72-2.14-1.63-3.15-1.63s-1.84.77-2.78 1.45c-1.57 1.1-3.23.95-4.2-.42-1.98-2.76-3.28-7.85-1.48-10.95C4.26 7.07 5.75 6.13 7.33 6.13c1.07 0 2.08.43 3.01.43.89 0 2.08-.5 3.32-.5 1.83 0 3.41.92 4.3 2.37-3.66 1.82-3.04 6.74.56 8.3-1.02 1.63-2.1 3.12-3.37 4.07h.03zM12.03 5.4c-.16-2.58 2.04-4.8 4.54-5.1-.2 2.65-2.45 4.8-4.54 5.1z" />
              </svg>
            </button>
          </div>

          <p className="text-xs font-bold text-black">
            Don't have an account? <a href="/signup" className="text-[#e60000] hover:underline">Sign Up here</a>
          </p>

        </div>
      </div>
    </div>
  );
}