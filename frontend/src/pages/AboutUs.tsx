import { HelpCircle, Mail, RefreshCcw, ScrollText } from "lucide-react";

// Assets
import about_us_upper from "../assets/about_us_upper.svg";
import about_us_header from "../assets/about_us_header.svg";
import about_us_image from "../assets/right.png";

export default function AboutUs() {
	return (
		<div className="min-h-screen w-full bg-[#F0EBE1] flex flex-col overflow-x-hidden font-display pb-16">
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
					{/* Top Row: About Us Intro */}
					<div className="flex-1 flex flex-row items-center min-h-0 pt-4">
						<div className="w-1/2 h-full flex flex-col justify-center pr-4 lg:pr-8">
							<div className="h-1/2 flex flex-col justify-end pb-4 lg:pb-8 mt-12">
								<img
									src={about_us_header}
									alt="About Us"
									className="h-24 md:h-28 lg:h-32 object-contain self-start mb-4 lg:mb-8"
								/>
								<h1 className="text-white text-3xl md:text-3xl lg:text-5xl font-extrabold tracking-widest uppercase leading-none ">
									Snug Rebel
								</h1>
							</div>

							<div className="h-1/2 pt-6 lg:pt-10 mt-8">
								<h2
									className="text-lg md:text-2xl lg:text-4xl font-extrabold mb-2 lg:mb-4 tracking-wide text-black uppercase"
									style={{
										fontFamily: "Impact, sans-serif",
										fontStyle: "italic",
									}}
								>
									Comfort Without Conformity
								</h2>
								<p className="text-black text-[10px] md:text-xs lg:text-base font-bold leading-snug lg:leading-relaxed max-w-lg">
									Snug Rebel is a proposed online streetwear
									brand for young adults who value street
									culture, daily mobility, and comfort. Our
									urban streetwear combines authentic style
									with lightweight, breathable textiles
									tailored for the Philippine heat.
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

					{/* Middle Row: Mission, Vision, What We Make */}
					<div className="shrink-0 pb-6 lg:pb-10 flex gap-4 lg:gap-6 min-h-0">
						<div
							className="flex-1 bg-[#111111] p-4 pb-6 lg:p-6 lg:pb-10 text-white flex flex-col justify-start relative overflow-hidden"
							style={{
								clipPath:
									"polygon(0 0, 100% 0, 100% 95%, 90% 100%, 80% 95%, 70% 100%, 60% 95%, 50% 100%, 40% 95%, 30% 100%, 20% 95%, 10% 100%, 0 95%)",
							}}
						>
							<span className="text-[#E60000] font-bold text-[10px] lg:text-sm tracking-widest">
								01
							</span>
							<h3 className="text-sm md:text-lg lg:text-2xl font-extrabold uppercase tracking-wider my-1 lg:my-2">
								Our Mission
							</h3>
							<p className="text-neutral-400 text-[9px] md:text-[11px] lg:text-sm leading-tight lg:leading-relaxed">
								To engineer climate-conscious, expressive
								streetwear sold through a seamless, dedicated
								online shopping platform.
							</p>
						</div>

						<div
							className="flex-1 bg-[#111111] p-4 pb-6 lg:p-6 lg:pb-10 text-white flex flex-col justify-start relative overflow-hidden"
							style={{
								clipPath:
									"polygon(0 0, 100% 0, 100% 95%, 90% 100%, 80% 95%, 70% 100%, 60% 95%, 50% 100%, 40% 95%, 30% 100%, 20% 95%, 10% 100%, 0 95%)",
							}}
						>
							<span className="text-[#E60000] font-bold text-[10px] lg:text-sm tracking-widest">
								02
							</span>
							<h3 className="text-sm md:text-lg lg:text-2xl font-extrabold uppercase tracking-wider my-1 lg:my-2 text-white">
								Our Vision
							</h3>
							<p className="text-neutral-400 text-[9px] md:text-[11px] lg:text-sm leading-tight lg:leading-relaxed">
								To become the leading homegrown casual
								streetwear brand for Filipino youth seeking
								practical comfort and authentic style.
							</p>
						</div>

						<div
							className="flex-1 bg-[#111111] p-4 pb-6 lg:p-6 lg:pb-10 text-white flex flex-col justify-start relative overflow-hidden"
							style={{
								clipPath:
									"polygon(0 0, 100% 0, 100% 95%, 90% 100%, 80% 95%, 70% 100%, 60% 95%, 50% 100%, 40% 95%, 30% 100%, 20% 95%, 10% 100%, 0 95%)",
							}}
						>
							<span className="text-[#E60000] font-bold text-[10px] lg:text-sm tracking-widest">
								03
							</span>
							<h3 className="text-sm md:text-lg lg:text-2xl font-extrabold uppercase tracking-wider my-1 lg:my-2">
								What We Make
							</h3>
							<p className="text-neutral-400 text-[9px] md:text-[11px] lg:text-sm leading-tight lg:leading-relaxed">
								Breathable drop-shoulder tees, open-collar
								linen-blend overshirts, relaxed woven shorts,
								lightweight utility bottoms, and minimalist
								graphic tops.
							</p>
						</div>
					</div>

					{/* ------------------------------------------------------------- */}
					{/* NEW INFORMATION SECTION: POLICIES, FAQS & CUSTOMER SERVICE    */}
					{/* ------------------------------------------------------------- */}

					<div className="shrink-0 flex flex-col gap-6 lg:gap-8 min-h-0 border-t border-black/10 pt-8 mt-2">
						{/* ROW 1: Terms of Service & Returns */}
						<div className="flex flex-col md:flex-row gap-6 lg:gap-8">
							{/* Core Store Policies */}
							<div className="flex-1 bg-white border-2 border-black p-6 lg:p-8 rounded-2xl shadow-[6px_6px_0_#111111] flex flex-col">
								<div className="flex items-center gap-3.5 mb-5 border-b-2 border-neutral-100 pb-4">
									<div className="bg-[#111111] text-white p-2.5 rounded-lg border-2 border-black shadow-[3px_3px_0_var(--color-brand-red)]">
										<ScrollText
											size={20}
											strokeWidth={2.5}
										/>
									</div>
									<h3 className="text-xl lg:text-2xl font-extrabold uppercase tracking-wider text-black">
										Store Policies
									</h3>
								</div>

								<div className="flex flex-col gap-4">
									<div>
										<h4 className="text-brand-red font-extrabold tracking-widest uppercase text-[10px] mb-1">
											Pricing & Payments
										</h4>
										<p className="text-neutral-600 text-[11px] lg:text-xs leading-relaxed font-bold">
											All prices are in Philippine Peso
											(PHP). We accept GCash, Maya, Bank
											Transfer, and Cash on Delivery
											(COD). Unpaid non-COD orders are
											automatically cancelled after 24
											hours.
										</p>
									</div>
									<div>
										<h4 className="text-brand-red font-extrabold tracking-widest uppercase text-[10px] mb-1">
											Shipping & Delivery
										</h4>
										<p className="text-neutral-600 text-[11px] lg:text-xs leading-relaxed font-bold">
											Standard delivery within Metro
											Manila takes 1-3 business days.
											Provincial shipping takes 3-7
											business days. We are not liable for
											severe weather delays or courier
											mishandling.
										</p>
									</div>
									<div>
										<h4 className="text-brand-red font-extrabold tracking-widest uppercase text-[10px] mb-1">
											General Terms
										</h4>
										<p className="text-neutral-600 text-[11px] lg:text-xs leading-relaxed font-bold">
											By creating an account, you agree to
											these terms. Snug Rebel operates out
											of Manila and reserves the right to
											refuse service if fraudulent
											behavior is suspected.
										</p>
									</div>
								</div>
							</div>

							{/* Returns & Exchanges */}
							<div className="flex-1 bg-white border-2 border-black p-6 lg:p-8 rounded-2xl shadow-[6px_6px_0_var(--color-brand-red)] flex flex-col">
								<div className="flex items-center gap-3.5 mb-5 border-b-2 border-neutral-100 pb-4">
									<div className="bg-[#111111] text-white p-2.5 rounded-lg border-2 border-black shadow-[3px_3px_0_var(--color-brand-red)]">
										<RefreshCcw
											size={20}
											strokeWidth={2.5}
										/>
									</div>
									<h3 className="text-xl lg:text-2xl font-extrabold uppercase tracking-wider text-black">
										Returns & Exchanges
									</h3>
								</div>

								<div className="flex-1 flex flex-col justify-center">
									<strong className="text-brand-red block mb-1.5 font-extrabold tracking-widest uppercase text-[10px]">
										DTI Compliance (R.A. 7394)
									</strong>
									<p className="text-neutral-700 text-xs lg:text-sm leading-relaxed font-bold mb-3">
										In compliance with the Department of
										Trade and Industry (DTI) regulations
										(Consumer Act of the Philippines), we
										accept returns strictly for{" "}
										<strong className="text-black">
											defective or damaged goods
										</strong>{" "}
										within seven (7) days of receipt.
									</p>
									<p className="text-neutral-500 text-[11px] lg:text-xs leading-relaxed font-bold">
										We do not offer refunds or exchanges for
										"change of mind." Returned items must be
										unwashed, unworn, and have original tags
										attached in their original packaging.
									</p>
								</div>
							</div>
						</div>

						{/* ROW 2: FAQs & Customer Service */}
						<div className="flex flex-col md:flex-row gap-6 lg:gap-8 pb-10">
							{/* FAQs */}
							<div className="flex-1 bg-white border-2 border-black p-6 lg:p-8 rounded-2xl shadow-[6px_6px_0_var(--color-brand-red)] flex flex-col">
								<div className="flex items-center gap-3.5 mb-5 border-b-2 border-neutral-100 pb-4">
									<div className="bg-[#111111] text-white p-2.5 rounded-lg border-2 border-black shadow-[3px_3px_0_var(--color-brand-red)]">
										<HelpCircle
											size={20}
											strokeWidth={2.5}
										/>
									</div>
									<h3 className="text-xl lg:text-2xl font-extrabold uppercase tracking-wider text-black">
										Frequently Asked Questions
									</h3>
								</div>

								<div className="flex flex-col gap-4">
									<div>
										<h4 className="text-black font-extrabold text-sm mb-1 uppercase tracking-tight">
											Do you only ship within Metro
											Manila?
										</h4>
										<p className="text-neutral-600 text-[11px] lg:text-xs leading-relaxed font-bold">
											No, we ship nationwide! While we are
											based in Manila, our local courier
											partners allow us to reach customers
											in provincial areas across the
											Philippines.
										</p>
									</div>
									<div>
										<h4 className="text-black font-extrabold text-sm mb-1 uppercase tracking-tight">
											How do I track my order?
										</h4>
										<p className="text-neutral-600 text-[11px] lg:text-xs leading-relaxed font-bold">
											You can use our Tracking page to
											check your order status using your
											Order ID and Phone Number. If you
											are logged in, your active orders
											will also appear on your Account
											dashboard.
										</p>
									</div>
									<div>
										<h4 className="text-black font-extrabold text-sm mb-1 uppercase tracking-tight">
											What if my size is out of stock?
										</h4>
										<p className="text-neutral-600 text-[11px] lg:text-xs leading-relaxed font-bold">
											We regularly restock popular items.
											Keep an eye on our shop or social
											media for restock announcements.
										</p>
									</div>
								</div>
							</div>

							{/* Customer Service */}
							<div className="flex-1 bg-white border-2 border-black p-6 lg:p-8 rounded-2xl shadow-[6px_6px_0_#111111] flex flex-col">
								<div className="flex items-center gap-3.5 mb-5 border-b-2 border-neutral-100 pb-4">
									<div className="bg-brand-red text-white p-2.5 rounded-lg border-2 border-black shadow-[3px_3px_0_#111111]">
										<Mail size={20} strokeWidth={2.5} />
									</div>
									<h3 className="text-xl lg:text-2xl font-extrabold uppercase tracking-wider text-black">
										Customer Service
									</h3>
								</div>

								<div className="flex-1 flex flex-col items-start justify-between">
									<p className="text-neutral-700 text-xs lg:text-sm leading-relaxed font-bold mb-6">
										Still have questions about a recent
										order, sizing, or tracking? Our support
										team is ready to help. We aim to respond
										to all inquiries within 24-48 hours
										during business days.
									</p>

									<a
										href="mailto:support@snugrebel.com"
										className="group relative inline-flex w-full sm:w-auto mt-auto focus:outline-none"
									>
										<div className="absolute inset-0 bg-[#E60000] transform -skew-x-12 translate-x-1.5 translate-y-1.5 transition-all duration-200 group-hover:translate-x-2 group-hover:translate-y-2 group-active:translate-x-0 group-active:translate-y-0" />
										<div className="relative z-10 flex items-center justify-center w-full px-6 py-3 bg-black text-white font-display font-extrabold uppercase tracking-widest text-xs transform -skew-x-12 transition-colors group-active:bg-neutral-800">
											<span className="transform skew-x-12 flex items-center gap-2">
												support@snugrebel.com
											</span>
										</div>
									</a>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* <Footer /> */}
		</div>
	);
}
