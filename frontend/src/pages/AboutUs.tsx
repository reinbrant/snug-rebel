// import Navbar from '../components/Navbar';
// import Footer from '../components/Footer';

// Assets
import about_us_upper from '../assets/about_us_upper.svg';
import about_us_header from '../assets/about_us_header.svg';
import about_us_image from '../assets/about_us_image.svg';

export default function AboutUs() {
  return (
    <div className="h-screen w-full bg-[#F0EBE1] flex flex-col overflow-hidden font-display">
      
      {/* <Navbar /> */}

      <div className="relative flex-1 w-full flex flex-col min-h-0">
        
        {/* Absolute Background Split (Black Top) */}
        <div className="absolute top-0 left-0 w-full h-[3%] bg-[#111111] z-0">
          <img 
            src={about_us_upper} 
            alt="Torn edge" 
            className="absolute top-full left-0 w-full -mt-1 object-cover pointer-events-none z-10"
          />
        </div>

        {/* Responsive Content Grid */}
        <div className="relative z-20 w-full h-full max-w-screen-2xl mx-auto px-6 lg:px-16 flex flex-col">
          
          {/* Top Row: flex-1 allows this section to shrink/grow dynamically to make room for the cards below */}
          <div className="flex-1 flex flex-row items-center min-h-0 pt-4">
            
            <div className="w-1/2 h-full flex flex-col justify-center pr-4 lg:pr-8">
              
              <div className="h-1/2 flex flex-col justify-end pb-4 lg:pb-8">
                <img 
                  src={about_us_header} 
                  alt="About Us" 
                  className="h-24 md:h-28 lg:h-32 object-contain self-start mb-4 lg:mb-8"
                />
                <h1 className="text-white text-3xl md:text-3xl lg:text-5xl font-extrabold tracking-widest uppercase leading-none">
                  Snug Rebel
                </h1>
              </div>

              <div className="h-1/2 pt-6 lg:pt-10">
                <h2 className="text-lg md:text-2xl lg:text-4xl font-extrabold mb-2 lg:mb-4 tracking-wide text-black uppercase" style={{ fontFamily: 'Impact, sans-serif', fontStyle: 'italic' }}>
                  Comfort Without Conformity
                </h2>
                <p className="text-black text-[10px] md:text-xs lg:text-base font-bold leading-snug lg:leading-relaxed max-w-lg">
                  Snug Rebel is a proposed online streetwear brand for young adults
                  who value street culture, daily mobility, and comfort. Our urban
                  streetwear combines authentic style with lightweight, breathable
                  textiles tailored for the Philippine heat.
                </p>
              </div>

            </div>

            <div className="w-1/2 h-full flex items-center justify-center p-4">
              <img 
                src={about_us_image} 
                alt="About Us Campaign" 
                className="w-full h-[70%] object-contain object-center drop-shadow-2xl"
              />
            </div>

          </div>

          {/* Bottom Row: Changed from strict percentages to shrink-0 so it naturally fits the text */}
          <div className="shrink-0 pb-6 lg:pb-10 flex gap-4 lg:gap-6 min-h-0">
            
            {/* Card 1: Added extra padding to the bottom (pb-6/pb-10) to avoid the clipPath cutting the text */}
            <div className="flex-1 bg-[#111111] p-4 pb-6 lg:p-6 lg:pb-10 text-white flex flex-col justify-start relative overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 95%, 90% 100%, 80% 95%, 70% 100%, 60% 95%, 50% 100%, 40% 95%, 30% 100%, 20% 95%, 10% 100%, 0 95%)' }}>
              <span className="text-[#E60000] font-bold text-[10px] lg:text-sm tracking-widest">01</span>
              <h3 className="text-sm md:text-lg lg:text-2xl font-extrabold uppercase tracking-wider my-1 lg:my-2">Our Mission</h3>
              <p className="text-neutral-400 text-[9px] md:text-[11px] lg:text-sm leading-tight lg:leading-relaxed">
                To engineer climate-conscious, expressive streetwear sold
                through a seamless, dedicated online shopping platform.
              </p>
            </div>

            {/* Card 2 */}
            <div className="flex-1 bg-[#111111] p-4 pb-6 lg:p-6 lg:pb-10 text-white flex flex-col justify-start relative overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 95%, 90% 100%, 80% 95%, 70% 100%, 60% 95%, 50% 100%, 40% 95%, 30% 100%, 20% 95%, 10% 100%, 0 95%)' }}>
              <span className="text-[#E60000] font-bold text-[10px] lg:text-sm tracking-widest">02</span>
              <h3 className="text-sm md:text-lg lg:text-2xl font-extrabold uppercase tracking-wider my-1 lg:my-2 text-neutral-500">Our Vision</h3>
              <p className="text-neutral-400 text-[9px] md:text-[11px] lg:text-sm leading-tight lg:leading-relaxed">
                To become the leading homegrown casual streetwear
                brand for Filipino youth seeking practical comfort and authentic
                style.
              </p>
            </div>

            {/* Card 3 */}
            <div className="flex-1 bg-[#111111] p-4 pb-6 lg:p-6 lg:pb-10 text-white flex flex-col justify-start relative overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 95%, 90% 100%, 80% 95%, 70% 100%, 60% 95%, 50% 100%, 40% 95%, 30% 100%, 20% 95%, 10% 100%, 0 95%)' }}>
              <span className="text-[#E60000] font-bold text-[10px] lg:text-sm tracking-widest">03</span>
              <h3 className="text-sm md:text-lg lg:text-2xl font-extrabold uppercase tracking-wider my-1 lg:my-2">What We Make</h3>
              <p className="text-neutral-400 text-[9px] md:text-[11px] lg:text-sm leading-tight lg:leading-relaxed">
                Breathable drop-shoulder tees, open-collar linen-blend
                overshirts, relaxed woven shorts, lightweight utility bottoms, and
                minimalist graphic tops.
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* <Footer /> */}
      
    </div>
  );
}