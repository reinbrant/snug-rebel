import { useEffect, useState } from "react";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import logo from "../../assets/snugrebel_logo_white.svg";
import { useHideOnScroll } from "../../hooks/useHideOnScroll.ts";
import { NAV_LINKS, type Page } from "../../routes.ts";
import NavButton, { RoughFilter } from "./NavButton.tsx";
import NavIconButton from "./NavIconButton.tsx";
import ShopMenu from "./ShopMenu.tsx";

export type Utility = "search" | "cart" | "account";

type NavBarProps = {
	page: Page | null;
	onNavigate: (page: Page) => void;
	onShopFilter: (filter: string | null) => void;
	onUtilityChange?: (utility: Utility | null) => void;
	cartOpen?: boolean;
	cartCount?: number;
	accountLabel?: string;
	accountActive?: boolean;
	searchActive?: boolean;
};

const LINK_GAP = "gap-8";

const slide = (hidden: boolean) =>
	[
		"transition-transform duration-300 ease-out motion-reduce:transition-none",
		hidden ? "translate-y-(--nav-hide-shift)" : "translate-y-0",
	].join(" ");

export default function NavBar({
	page,
	onNavigate,
	onShopFilter,
	onUtilityChange,
	cartOpen,
	cartCount,
	accountLabel = "Account",
	accountActive = false,
	searchActive = false,
}: NavBarProps) {
	const scrolledAway = useHideOnScroll();
	const [shopMenuOpen, setShopMenuOpen] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [keyboardFocus, setKeyboardFocus] = useState(false);
	const [activeUtility, setActiveUtility] = useState<Utility | null>(null);

	// Add hover reveal state
	const [mouseHoverReveal, setMouseHoverReveal] = useState(false);

	// Reconfigured: the bar is hidden only if all these conditions are true.
	// If the user's mouse is near the top edge, it pops out.
	const hidden =
		scrolledAway &&
		!shopMenuOpen &&
		!keyboardFocus &&
		!mobileMenuOpen &&
		!mouseHoverReveal;

	const toggleUtility = (utility: Utility) => {
		setMobileMenuOpen(false);
		if (utility === "account") {
			setActiveUtility(null);
			onUtilityChange?.("account");
			return;
		}
		const next = activeUtility === utility ? null : utility;
		setActiveUtility(next);
		onUtilityChange?.(next);
	};

	useEffect(() => {
		if (mobileMenuOpen)
			document
				.querySelector<HTMLElement>(
					"#primary-navigation button, #primary-navigation a",
				)
				?.focus();
	}, [mobileMenuOpen]);

	useEffect(() => {
		if (!activeUtility && !mobileMenuOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			setActiveUtility(null);
			setMobileMenuOpen(false);
			if (mobileMenuOpen)
				document.getElementById("mobile-navigation-toggle")?.focus();
			onUtilityChange?.(null);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [activeUtility, mobileMenuOpen, onUtilityChange]);

	return (
		<>
			{/* Hover Target: Hidden edge at the absolute top. Hovering makes the Nav drop down. */}
			<div
				className="fixed inset-x-0 top-0 h-4 z-[60]"
				onMouseEnter={() => setMouseHoverReveal(true)}
				onMouseLeave={() => setMouseHoverReveal(false)}
			/>

			<header
				className="pointer-events-none fixed inset-x-0 top-0 z-50 text-black"
				onMouseEnter={() => setMouseHoverReveal(true)}
				onMouseLeave={() => setMouseHoverReveal(false)}
				onFocus={(e) =>
					setKeyboardFocus(e.target.matches(":focus-visible"))
				}
				onBlur={(e) => {
					if (!e.currentTarget.contains(e.relatedTarget))
						setKeyboardFocus(false);
				}}
			>
				<RoughFilter />

				{/* white bar background */}
				<div
					aria-hidden="true"
					className={[
						"pointer-events-auto absolute inset-x-0 top-0 h-(--nav-h) bg-white shadow-[0_2px_0_rgba(0,0,0,0.08)]",
						slide(hidden),
					].join(" ")}
				/>

				<nav
					aria-label="Main"
					className="relative grid h-(--nav-h) grid-cols-[1fr_auto] items-center px-(--nav-edge) lg:grid-cols-[1fr_auto_1fr]"
				>
					<a
						href="/"
						onClick={(e) => {
							e.preventDefault();
							onNavigate("home");
							setMobileMenuOpen(false);
						}}
						aria-label="Snug Rebel, home"
						className={[
							"pointer-events-auto justify-self-start focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black",
							slide(hidden),
						].join(" ")}
					>
						<img
							src={logo}
							alt=""
							className="h-(--nav-logo-h) w-auto brightness-0"
							draggable={false}
						/>
					</a>

					{/* Primary links */}
					<ul
						id="primary-navigation"
						className={[
							"pointer-events-auto lg:items-center lg:static lg:flex lg:flex-row lg:bg-transparent lg:p-0 lg:shadow-none",
							mobileMenuOpen
								? "absolute inset-x-0 top-full flex flex-col items-start bg-white p-6 shadow-lg"
								: "hidden",
							LINK_GAP,
							slide(hidden),
						].join(" ")}
					>
						{NAV_LINKS.map(({ page: target, label }) => (
							<li key={target}>
								{target === "shop" ? (
									<ShopMenu
										label={label}
										selected={page === target}
										onFilter={(filter) => {
											onShopFilter(filter);
											setMobileMenuOpen(false);
										}}
										onOpenChange={setShopMenuOpen}
									/>
								) : (
									<NavButton
										label={label}
										selected={page === target}
										onClick={() => {
											onNavigate(target);
											setMobileMenuOpen(false);
										}}
									/>
								)}
							</li>
						))}
					</ul>

					{/* Utilities */}
					<div className="flex items-center justify-self-end">
						<div className="lg:hidden">
							<NavIconButton
								id="mobile-navigation-toggle"
								label={
									mobileMenuOpen
										? "Close navigation"
										: "Open navigation"
								}
								icon={mobileMenuOpen ? X : Menu}
								aria-expanded={mobileMenuOpen}
								aria-controls="primary-navigation"
								onClick={() =>
									setMobileMenuOpen((open) => !open)
								}
								className={[
									"pointer-events-auto",
									slide(hidden),
								].join(" ")}
							/>
						</div>
						<NavIconButton
							label="Search"
							icon={Search}
							active={searchActive}
							onClick={() => toggleUtility("search")}
							className={[
								"pointer-events-auto",
								slide(hidden),
							].join(" ")}
						/>
						<div
							className={[
								"pointer-events-auto relative flex size-16 items-center justify-center rounded-full bg-white",
								"transition-[translate,box-shadow] duration-300 ease-out motion-reduce:transition-none",
								hidden
									? "translate-x-(--cart-dock-x) shadow-[0_2px_0_rgba(0,0,0,0.2)] translate-y-4"
									: "translate-x-0 shadow-none",
							].join(" ")}
						>
							<NavIconButton
								label={
									cartCount
										? `Cart (${cartCount} items)`
										: "Cart"
								}
								icon={ShoppingBag}
								active={cartOpen ?? activeUtility === "cart"}
								onClick={() => toggleUtility("cart")}
							/>
							{!!cartCount && cartCount > 0 && (
								<span
									aria-hidden="true"
									className="pointer-events-none absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1 font-display text-[11px] font-black leading-none text-white"
								>
									{cartCount > 99 ? "99+" : cartCount}
								</span>
							)}
						</div>
						<NavIconButton
							label={accountLabel}
							icon={User}
							active={accountActive}
							onClick={() => toggleUtility("account")}
							className={[
								"pointer-events-auto",
								slide(hidden),
							].join(" ")}
						/>
					</div>
				</nav>
			</header>
		</>
	);
}
