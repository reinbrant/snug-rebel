import logoBlack from "../../assets/snugrebel_logo_black.svg";

export default function LogoLoader() {
	return (
		<div
			role="status"
			aria-label="Loading..."
			className="flex w-full h-full min-h-[40vh] items-center justify-center px-4 py-12"
		>
			<div className="relative h-20 sm:h-24 w-auto drop-shadow-md">
				{/* Background faint grey logo */}
				<img
					src={logoBlack}
					alt=""
					className="h-full w-auto opacity-15"
				/>

				{/* Filling black logo */}
				<img
					src={logoBlack}
					alt=""
					className="absolute inset-0 h-full w-auto object-cover object-bottom overflow-hidden"
					style={{
						animation:
							"fillUp 1.25s cubic-bezier(0.83, 0, 0.17, 1) infinite alternate",
					}}
				/>
			</div>

			<style>{`
				@keyframes fillUp {
					0% { clip-path: inset(100% 0 0 0); }
					100% { clip-path: inset(0 0 0 0); }
				}
			`}</style>
		</div>
	);
}
