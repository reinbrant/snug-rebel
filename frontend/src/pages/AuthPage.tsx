import { useState, type FormEvent } from "react";
import {
	Link,
	Navigate,
	useLocation,
	useNavigate,
	useSearchParams,
} from "react-router";
import { authErrorMessage } from "../api/auth";
import { useAuth } from "../context/authContext";
import { ROUTES } from "../routes";
import snugrebel_logo_black from "../assets/snugrebel_logo_black.svg";
import sign_up_img from "../assets/sign_up_img.jpg";

function safeReturnTo(value: string | null): string {
	if (!value?.startsWith("/") || value.startsWith("//"))
		return ROUTES.account;
	const url = new URL(value, window.location.origin);
	return url.origin === window.location.origin &&
		url.pathname !== ROUTES.signIn &&
		url.pathname !== ROUTES.signUp
		? `${url.pathname}${url.search}${url.hash}`
		: ROUTES.account;
}

export default function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
	const auth = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [params] = useSearchParams();
	const returnTo = safeReturnTo(params.get("returnTo"));
	const checkoutState = (location.state as { checkoutState?: unknown } | null)
		?.checkoutState;
	const registering = mode === "sign-up";

	const [form, setForm] = useState({
		firstName: "",
		lastName: "",
		email: "",
		phoneNumber: "",
		password: "",
		confirmPassword: "",
	});
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	if (auth.status === "loading")
		return (
			<div
				className="min-h-screen flex items-center justify-center font-display text-lg"
				role="status"
			>
				Checking your session…
			</div>
		);
	if (auth.user)
		return <Navigate to={returnTo} replace state={checkoutState} />;

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");
		if (registering && form.password !== form.confirmPassword) {
			setError("Your passwords do not match.");
			return;
		}
		if (new TextEncoder().encode(form.password).length > 72) {
			setError("Your password must be at most 72 UTF-8 bytes.");
			return;
		}
		setBusy(true);
		try {
			if (registering) await auth.signUp(form);
			else await auth.signIn(form.email, form.password);
			navigate(returnTo, { replace: true, state: checkoutState });
		} catch (error) {
			setError(authErrorMessage(error));
		} finally {
			setBusy(false);
		}
	}

	const update = (name: keyof typeof form, value: string) =>
		setForm((current) => ({ ...current, [name]: value }));

	return (
		<div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-display overflow-hidden">
			{/* Left Side: Campaign Image with Gradient */}
			<div className="hidden lg:block lg:w-1/2 relative bg-[#111]">
				<img
					src={sign_up_img}
					alt="Auth Campaign"
					className="absolute inset-0 w-full h-full object-cover"
				/>
				{/* Black to Transparent Gradient Overlay */}
				<div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/20 pointer-events-none" />
			</div>

			{/* Right Side: Form Container */}
			<div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 overflow-y-auto">
				<div className="w-full max-w-md flex flex-col items-center">
					<h1 className="text-2xl lg:text-3xl font-extrabold text-black mb-3 tracking-wide">
						{registering ? "Create Your Account" : "Log In"}
					</h1>

					<img
						src={snugrebel_logo_black}
						alt="Snug Rebel Logo"
						className="w-48 lg:w-64 object-contain mb-6 pointer-events-none"
					/>

					<form
						onSubmit={submit}
						className="w-full flex flex-col gap-5"
					>
						<fieldset
							disabled={busy}
							className="border-0 p-0 m-0 w-full flex flex-col gap-4"
						>
							{registering && (
								<div className="grid grid-cols-2 gap-4">
									<div className="flex flex-col gap-1">
										<label className="text-sm font-bold text-black ml-1">
											First Name
										</label>
										<input
											type="text"
											required
											value={form.firstName}
											onChange={(e) =>
												update(
													"firstName",
													e.target.value,
												)
											}
											placeholder="First Name"
											className="w-full bg-[#f8f8f8] rounded-xl px-4 py-3.5 border border-transparent outline-none text-base text-black placeholder-neutral-400 focus:border-black transition-colors"
										/>
									</div>
									<div className="flex flex-col gap-1">
										<label className="text-sm font-bold text-black ml-1">
											Last Name
										</label>
										<input
											type="text"
											required
											value={form.lastName}
											onChange={(e) =>
												update(
													"lastName",
													e.target.value,
												)
											}
											placeholder="Last Name"
											className="w-full bg-[#f8f8f8] rounded-xl px-4 py-3.5 border border-transparent outline-none text-base text-black placeholder-neutral-400 focus:border-black transition-colors"
										/>
									</div>
								</div>
							)}

							{/* Email Field */}
							<div className="flex flex-col gap-1">
								<label className="text-sm font-bold text-black ml-1">
									Email
								</label>
								<input
									type="email"
									required
									maxLength={255}
									value={form.email}
									onChange={(e) =>
										update("email", e.target.value)
									}
									placeholder="Email"
									className="w-full bg-[#f8f8f8] rounded-xl px-4 py-3.5 border border-transparent outline-none text-base text-black placeholder-neutral-400 focus:border-black transition-colors"
								/>
							</div>

							{registering && (
								<div className="flex flex-col gap-1">
									<label className="text-sm font-bold text-black ml-1">
										Phone Number (optional)
									</label>
									<input
										type="tel"
										maxLength={100}
										value={form.phoneNumber}
										onChange={(e) =>
											update(
												"phoneNumber",
												e.target.value,
											)
										}
										placeholder="Phone number"
										className="w-full bg-[#f8f8f8] rounded-xl px-4 py-3.5 border border-transparent outline-none text-base text-black placeholder-neutral-400 focus:border-black transition-colors"
									/>
								</div>
							)}

							{/* Password Field */}
							<div className="flex flex-col gap-1">
								<label className="text-sm font-bold text-black ml-1">
									Password
								</label>
								<div className="relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-3.5 border border-transparent focus-within:border-black transition-colors">
									<input
										type={
											showPassword ? "text" : "password"
										}
										required
										minLength={registering ? 8 : undefined}
										value={form.password}
										onChange={(e) =>
											update("password", e.target.value)
										}
										placeholder="Enter your password"
										className="w-full bg-transparent outline-none text-base text-black placeholder-neutral-400"
									/>
									<button
										type="button"
										onClick={() =>
											setShowPassword(!showPassword)
										}
										className="text-neutral-400 hover:text-black shrink-0 focus:outline-none text-xs font-bold uppercase tracking-wide ml-2"
									>
										{showPassword ? "Hide" : "Show"}
									</button>
								</div>
								{registering && (
									<p className="text-xs text-neutral-500 ml-1 mt-1">
										Use at least 8 characters.
									</p>
								)}
							</div>

							{registering && (
								<div className="flex flex-col gap-1">
									<label className="text-sm font-bold text-black ml-1">
										Confirm Password
									</label>
									<div className="relative flex items-center bg-[#f8f8f8] rounded-xl px-4 py-3.5 border border-transparent focus-within:border-black transition-colors">
										<input
											type={
												showConfirmPassword
													? "text"
													: "password"
											}
											required
											value={form.confirmPassword}
											onChange={(e) =>
												update(
													"confirmPassword",
													e.target.value,
												)
											}
											placeholder="Confirm Password"
											className="w-full bg-transparent outline-none text-base text-black placeholder-neutral-400"
										/>
										<button
											type="button"
											onClick={() =>
												setShowConfirmPassword(
													!showConfirmPassword,
												)
											}
											className="text-neutral-400 hover:text-black shrink-0 focus:outline-none text-xs font-bold uppercase tracking-wide ml-2"
										>
											{showConfirmPassword
												? "Hide"
												: "Show"}
										</button>
									</div>
								</div>
							)}

							{error && (
								<div
									className="mt-2 flex items-center gap-2 text-sm text-brand-red bg-red-50 p-3.5 rounded-xl border border-red-100 font-bold"
									role="alert"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="3"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="shrink-0"
									>
										<circle cx="12" cy="12" r="10"></circle>
										<line
											x1="12"
											y1="8"
											x2="12"
											y2="12"
										></line>
										<line
											x1="12"
											y1="16"
											x2="12.01"
											y2="16"
										></line>
									</svg>
									<span>{error}</span>
								</div>
							)}

							{/* Custom Angled Submit Button */}
							<div className="relative group cursor-pointer inline-block w-4/5 mx-auto mt-6 mb-2">
								<div className="absolute inset-0 bg-brand-red transform -skew-x-12 translate-x-2 translate-y-2 transition-all duration-200 ease-out group-hover:translate-x-3 group-hover:translate-y-3 group-active:translate-x-0 group-active:translate-y-0" />
								<button
									type="submit"
									disabled={busy}
									className="relative z-10 w-full px-8 py-3.5 bg-black text-white font-display font-extrabold text-lg tracking-wider uppercase transform -skew-x-12 transition-all duration-200 group-hover:bg-neutral-900 group-active:bg-black focus:outline-none flex justify-center items-center cursor-pointer"
								>
									<span className="inline-block transform skew-x-12">
										{busy
											? "Please wait…"
											: registering
												? "Confirm"
												: "Log In"}
									</span>
								</button>
							</div>
						</fieldset>
					</form>

					{/* Switch Mode Link */}
					<p className="text-sm font-bold text-black mt-6 text-center">
						{registering
							? "Already have an account? "
							: "Don't have an account? "}
						<Link
							to={`${registering ? ROUTES.signIn : ROUTES.signUp}?returnTo=${encodeURIComponent(returnTo)}`}
							state={{ checkoutState }}
							className="text-brand-red hover:underline decoration-2 underline-offset-4"
						>
							{registering ? "Log In here" : "Sign Up here"}
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
