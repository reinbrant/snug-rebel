import { Link } from "react-router";
import { ROUTES } from "../routes";
import snugrebel_logo_white from "../assets/snugrebel_logo_white.svg";
import landpage_bg from "../assets/landpage_bg.png";
export default function LandingPage() {
	return (
		<div className="bg-black w-full overflow-x-hidden">
			<section className="relative w-full h-screen flex flex-col items-center justify-center">
				{/* Background */}
				<img
					src={landpage_bg}
					alt="Hero Background"
					className="absolute inset-0 w-full h-full object-cover"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none z-10" />

				{/* Content */}
				<div className="relative z-20 flex flex-col items-center justify-center px-4 w-full h-full">
					<img
						src={snugrebel_logo_white}
						alt="Snug Rebel"
						className="w-[90%] max-w-[800px] object-contain drop-shadow-2xl pointer-events-none mb-10"
					/>

					<Link
						to={ROUTES.shop}
						className="
              relative z-20 px-10 py-4 
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
				</div>
			</section>
		</div>
	);
}
