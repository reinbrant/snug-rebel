import { Link } from "react-router";
import { ROUTES } from "../routes";
import snugrebel_logo_white from "../assets/snugrebel_logo_white.svg";
import landpage_bg from "../assets/landpage_bg.png";

export default function LandingPage() {
	return (
		<div className="bg-black w-full h-screen overflow-hidden">
			<section className="relative w-full h-full flex flex-col items-center justify-center">
				{/* Background */}
				<img
					src={landpage_bg}
					alt="Hero Background"
					className="absolute inset-0 w-full h-full object-cover"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none z-10" />

				{/* Content */}
				<div className="relative z-20 flex flex-col items-center justify-center px-4 w-full h-full max-w-5xl mx-auto text-center">
					<img
						src={snugrebel_logo_white}
						alt="Snug Rebel"
						className="w-[85%] max-w-[720px] object-contain drop-shadow-2xl pointer-events-none mb-4"
					/>

					<p className="text-white/90 font-display font-medium text-sm md:text-lg lg:text-xl tracking-[0.2em] uppercase mb-10 drop-shadow-md">
						Structured for the streets, softened for you.
					</p>

					<div className="flex flex-col sm:flex-row items-center gap-5 w-full justify-center">
						<Link
							to={ROUTES.shop}
							className="
								relative z-25 px-10 py-4 
								bg-[#e50914] text-white font-display font-black text-lg tracking-widest uppercase
								border-2 border-[#e50914]
								transition-all duration-200 ease-out
								-skew-x-6 shadow-[6px_6px_0px_#000]
								hover:bg-white hover:text-black hover:border-black hover:shadow-[8px_8px_0px_#e50914]
								active:scale-95
							"
						>
							<span className="block skew-x-6">Enter Shop</span>
						</Link>

						<Link
							to={ROUTES.about}
							className="
								relative z-25 px-10 py-4 
								bg-black/60 backdrop-blur-sm text-white font-display font-black text-lg tracking-widest uppercase
								border-2 border-white/80
								transition-all duration-200 ease-out
								-skew-x-6 shadow-[6px_6px_0px_rgba(255,255,255,0.3)]
								hover:bg-white hover:text-black hover:border-black hover:shadow-[8px_8px_0px_#e50914]
								active:scale-95
							"
						>
							<span className="block skew-x-6">About Us</span>
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
