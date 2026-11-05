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
	/** Current page (null on pages that aren't in the nav). Drives the selected style. */
	page: Page | null;
	onNavigate: (page: Page) => void;
	/** Called when a SHOP dropdown filter is picked (null = all). */
	onShopFilter: (filter: string | null) => void;
	/** Fires when a utility icon is toggled on (its name) or off (null). One is active at a time. */
	onUtilityChange?: (utility: Utility | null) => void;
	cartOpen?: boolean;
	cartCount?: number;
    accountLabel?: string;
    accountActive?: boolean;
};

// Sizes live in index.css (--nav-h, --nav-edge, --nav-logo-h, ...).
// Spacing between the link buttons is the gap below; it's the same for every pair,
// whatever is selected, because no button changes width.
const LINK_GAP = "gap-8";

/** Slides one piece of the bar up out of view. */
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
    accountLabel = 'Account',
    accountActive = false,
}: NavBarProps) {
	const scrolledAway = useHideOnScroll();
	const [shopMenuOpen, setShopMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [keyboardFocus, setKeyboardFocus] = useState(false);
	const [activeUtility, setActiveUtility] = useState<Utility | null>(null);

	// keep the bar up while the dropdown is open or someone is tabbing through it
	const hidden = scrolledAway && !shopMenuOpen && !keyboardFocus && !mobileMenuOpen;

	const toggleUtility = (utility: Utility) => {
        setMobileMenuOpen(false);
		if (utility === 'account') { setActiveUtility(null); onUtilityChange?.('account'); return; }
		const next = activeUtility === utility ? null : utility;
		setActiveUtility(next);
		onUtilityChange?.(next);
	};

    useEffect(() => {
        if (mobileMenuOpen) document.querySelector<HTMLElement>('#primary-navigation button, #primary-navigation a')?.focus();
    }, [mobileMenuOpen]);

	// Escape deselects the active utility icon
	useEffect(() => {
		if (!activeUtility && !mobileMenuOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			setActiveUtility(null);
            setMobileMenuOpen(false);
            if (mobileMenuOpen) document.getElementById('mobile-navigation-toggle')?.focus();
			onUtilityChange?.(null);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [activeUtility, mobileMenuOpen, onUtilityChange]);

	return (
		// The header ignores the mouse; each visible piece opts back in with
		// pointer-events-auto so the empty parts of the bar never block the page.
		<header
			className="pointer-events-none fixed inset-x-0 top-0 z-50 text-black"
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
				{/* logo (source svg is white, so flatten it to black) */}
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

				{/* primary links, generated from NAV_LINKS */}
				<ul
                    id="primary-navigation"
					className={[
						"pointer-events-auto lg:items-center lg:static lg:flex lg:flex-row lg:bg-transparent lg:p-0 lg:shadow-none",
                        mobileMenuOpen ? "absolute inset-x-0 top-full flex flex-col items-start bg-white p-6 shadow-lg" : "hidden",
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
									onFilter={filter => { onShopFilter(filter); setMobileMenuOpen(false); }}
									onOpenChange={setShopMenuOpen}
								/>
							) : (
								<NavButton
									label={label}
									selected={page === target}
									onClick={() => { onNavigate(target); setMobileMenuOpen(false); }}
								/>
							)}
						</li>
					))}
				</ul>

				{/* utilities: search | cart (stays put) | account */}
				<div className="flex items-center justify-self-end">
                    <div className="lg:hidden">
                    <NavIconButton
                        id="mobile-navigation-toggle"
                        label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
                        icon={mobileMenuOpen ? X : Menu}
                        aria-expanded={mobileMenuOpen}
                        aria-controls="primary-navigation"
                        onClick={() => setMobileMenuOpen(open => !open)}
                        className={['pointer-events-auto', slide(hidden)].join(' ')}
                    />
                    </div>
					<NavIconButton
						label="Search"
						icon={Search}
						active={activeUtility === "search"}
						onClick={() => toggleUtility("search")}
						className={["pointer-events-auto", slide(hidden)].join(
							" ",
						)}
					/>

					{/*
            The cart never leaves. It sits in a white container as tall as the bar, so it
            blends into the bar while visible. When the bar hides, the container slides right
            into the account icon's slot (--cart-dock-x in index.css).
          */}
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
								cartCount ? `Cart (${cartCount} items)` : "Cart"
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
						className={["pointer-events-auto", slide(hidden)].join(
							" ",
						)}
					/>
				</div>
			</nav>
		</header>
	);
}
