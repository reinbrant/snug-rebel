import star_bg from '../assets/star_bg.svg';
import snugrebel_logo_white from '../assets/snugrebel_logo_white.svg';
import instagram from '../assets/instagram.svg';
import facebook from '../assets/facebook.svg';
import tiktok from '../assets/tiktok.svg';
import email from '../assets/email.svg';

function SocialIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <button
      onClick={() => console.log(`${alt} clicked`)}
      className="
        transition-all duration-200 ease-out
        opacity-100 scale-100
        hover:scale-110 hover:opacity-80 hover:-translate-y-1
        focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black
        active:scale-95 active:opacity-60 active:translate-y-0
      "
    >
      {/* Icon size slightly reduced to fit the shorter footer */}
      <img src={src} alt={alt} className="w-6 h-6 md:w-8 md:h-8 object-contain" />
    </button>
  );
}

export default function Footer() {
  return (
    <footer className="relative w-full bg-[#0a0a0a] overflow-hidden border-t border-neutral-900">
      
      {/* Background Star Pattern */}
      <img 
        src={star_bg} 
        alt="Star Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
      />

      {/* Footer Content Wrapper: Reduced py-16 to py-4 to make it a thin bar */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between px-4 md:px-12 py-4 w-full max-w-screen-2xl mx-auto gap-4">
        
        {/* Left Side: Logo & Text grouped horizontally */}
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
          <img 
            src={snugrebel_logo_white} 
            alt="Snug Rebel Logo" 
            className="w-32 md:w-40 object-contain pointer-events-none drop-shadow-lg"
          />
          <p className="text-neutral-400 font-display text-[10px] md:text-xs tracking-[0.2em] uppercase">
            © {new Date().getFullYear()} SNUG REBEL - STRUCTURED FOR THE STREETS, SOFTENED FOR YOU.
          </p>
        </div>

        {/* Right Side: Social Icons */}
        <div className="flex items-center gap-4 md:gap-6">
          <SocialIcon src={instagram} alt="Instagram" />
          <SocialIcon src={facebook} alt="Facebook" />
          <SocialIcon src={email} alt="Email" />
          <SocialIcon src={tiktok} alt="TikTok" />
        </div>

      </div>
    </footer>
  );
}