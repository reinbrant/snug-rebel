import { useState } from 'react';
import sign_up_img from '../assets/sign_up_img.jpg';
import snugrebel_logo_black from '../assets/snugrebel_logo_black.svg';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Form submitted successfully', formData);
      // Add authentication logic here
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-display overflow-hidden">
      
      {/* Left Side: Image (Hidden on very small screens, visible on lg) */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[#111]">
        <img 
          src={sign_up_img} 
          alt="Sign Up Campaign" 
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Right Side: Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center mt-12 lg:mt-0">
          
          <h1 className="text-2xl lg:text-3xl font-extrabold text-black mb-4 tracking-wide">Create Your Account</h1>
          
          <img 
            src={snugrebel_logo_black} 
            alt="Snug Rebel Logo" 
            className="w-48 lg:w-64 object-contain mb-8 lg:mb-12 pointer-events-none"
          />

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

            {/* Full Name Field */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-black ml-1">Full Name</label>
              <div className={`relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-3 border ${errors.fullName ? 'border-red-500' : 'border-transparent'}`}>
                <svg className="w-5 h-5 text-[#e60000] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
                </svg>
                <input 
                  type="text" 
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Full Name"
                  className="w-full bg-transparent outline-none ml-3 text-sm text-black placeholder-neutral-400"
                />
              </div>
              {errors.fullName && <span className="text-[10px] text-red-500 ml-1 font-bold">{errors.fullName}</span>}
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
            </div>

            {/* Confirm Password Field */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-black ml-1">Confirm Password</label>
              <div className={`relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-3 border ${errors.confirmPassword ? 'border-red-500' : 'border-transparent'}`}>
                <svg className="w-5 h-5 text-[#e60000] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm Password"
                  className="w-full bg-transparent outline-none mx-3 text-sm text-black placeholder-neutral-400"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-neutral-400 hover:text-black shrink-0 focus:outline-none">
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && <span className="text-[10px] text-red-500 ml-1 font-bold">{errors.confirmPassword}</span>}
            </div>

            {/* Custom Submit Button */}
            <div className="relative group cursor-pointer inline-block w-4/5 mx-auto mt-6">
              <div className="absolute inset-0 bg-[#e60000] transform -skew-x-12 translate-x-2 translate-y-2 transition-all duration-200 ease-out group-hover:translate-x-3 group-hover:translate-y-3 group-active:translate-x-0 group-active:translate-y-0" />
              <button 
                type="submit"
                className="relative z-10 w-full px-8 py-3 bg-black text-white font-display font-extrabold text-lg tracking-wider uppercase transform -skew-x-12 transition-all duration-200 group-hover:bg-neutral-900 group-active:bg-black focus:outline-none flex justify-center items-center"
              >
                <span className="inline-block transform skew-x-12">CONFIRM</span>
                <svg className="absolute -right-6 top-1/2 -translate-y-1/2 w-10 h-10 text-white transform skew-x-12 drop-shadow-md pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="black" strokeWidth="1" />
                </svg>
              </button>
            </div>

          </form>

          {/* Login Link */}
          <p className="text-[10px] lg:text-xs font-bold text-black mt-8">
            Already have an account? <a href="/login" className="text-[#e60000] hover:underline">Log In here</a>
          </p>

        </div>
      </div>
    </div>
  );
}