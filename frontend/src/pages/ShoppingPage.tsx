/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useCart } from "../context/cartContext";
import PillButton from "../components/ui/PillButton";
import ShopItemCard from "../components/shop/ShopItemCard";
import ShopSidebar from "../components/shop/ShopSidebar";
import LogoLoader from "../components/ui/LogoLoader";
import { useHideOnScroll } from "../hooks/useHideOnScroll";
import { itemPath } from "../routes";
import { ChevronRight } from "lucide-react";
import {
	CATEGORIES,
	SORT_OPTIONS,
	getProducts,
	type Category,
	type Product,
	type SortKey,
} from "../data/products";

const effectivePrice = (p: Product) => p.salePrice ?? p.price;

const SORTERS: Record<SortKey, (a: Product, b: Product) => number> = {
	"best-selling": (a, b) => b.soldCount - a.soldCount,
	"name-asc": (a, b) => a.name.localeCompare(b.name),
	"name-desc": (a, b) => b.name.localeCompare(a.name),
	"price-asc": (a, b) => effectivePrice(a) - effectivePrice(b),
	"price-desc": (a, b) => effectivePrice(b) - effectivePrice(a),
};

// Global cache for instant reloads when navigating back and forth!
let globalProductsCache: Product[] | null = null;

export default function Shop() {
	const [productsData, setProductsData] = useState<Product[]>(
		globalProductsCache || [],
	);
	const [loading, setLoading] = useState(!globalProductsCache);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	const [sidebarOpen, setSidebarOpen] = useState(true);
	const navbarHidden = useHideOnScroll();

	useEffect(() => {
		// If we already have cached data, we immediately skip the loader.
		if (globalProductsCache) setLoading(false);

		getProducts()
			.then((data) => {
				globalProductsCache = data;
				setProductsData(data);
			})
			.catch((err) =>
				setError(
					err instanceof Error
						? err.message
						: "Failed to load products",
				),
			)
			.finally(() => setLoading(false));

		const savedScroll = sessionStorage.getItem("shopScroll");
		if (savedScroll) {
			window.scrollTo({
				top: parseInt(savedScroll, 10),
				behavior: "instant",
			});
			sessionStorage.removeItem("shopScroll");
		}
	}, []);

	const [searchParams, setSearchParams] = useSearchParams();

	const categoryParam = searchParams.get("filter");
	const category: Category | null =
		CATEGORIES.find((c) => c.value === categoryParam)?.value ?? null;
	const setCategory = (next: Category | null) => {
		const nextParams = new URLSearchParams(searchParams);
		if (next) nextParams.set("filter", next);
		else nextParams.delete("filter");
		setSearchParams(nextParams);
	};

	const sortParam = searchParams.get("sort") as SortKey | null;
	const sort: SortKey = sortParam ?? "best-selling";
	const setSort = (next: SortKey) => {
		const nextParams = new URLSearchParams(searchParams);
		nextParams.set("sort", next);
		setSearchParams(nextParams);
	};

	const saleOnly = searchParams.get("sale") === "true";
	const setSaleOnly = (next: boolean) => {
		const nextParams = new URLSearchParams(searchParams);
		if (next) nextParams.set("sale", "true");
		else nextParams.delete("sale");
		setSearchParams(nextParams);
	};

	const activeFilterLabel = useMemo(() => {
		const parts: string[] = [];
		if (category) {
			const foundCat = CATEGORIES.find((c) => c.value === category);
			if (foundCat) parts.push(foundCat.label.toUpperCase());
		} else {
			parts.push("ALL ITEMS");
		}

		const foundSort = SORT_OPTIONS.find((s) => s.value === sort);
		if (foundSort) parts.push(foundSort.label.toUpperCase());

		if (saleOnly) parts.push("ON SALE");

		return parts.join(" • ");
	}, [category, sort, saleOnly]);

	const products = useMemo(() => {
		const normalizedCategory = category?.trim().toLowerCase() ?? null;

		let filtered = normalizedCategory
			? normalizedCategory === "best-selling"
				? productsData.filter(
						(p) =>
							p.soldCount > 0 ||
							p.categories.some(
								(c) => c.toLowerCase() === "best-selling",
							),
					)
				: productsData.filter((p) =>
						p.categories.some(
							(c) =>
								c.trim().toLowerCase() === normalizedCategory,
						),
					)
			: productsData;

		if (saleOnly)
			filtered = filtered.filter(
				(p) => p.salePrice != null && p.salePrice > 0,
			);

		const activeSort: SortKey =
			normalizedCategory === "best-selling" && sort === "best-selling"
				? "best-selling"
				: sort;

		return [...filtered].sort((a, b) => {
			const aOOS = (a.stockLeft ?? 0) <= 0;
			const bOOS = (b.stockLeft ?? 0) <= 0;
			if (aOOS && !bOOS) return 1;
			if (!aOOS && bOOS) return -1;

			const primary = SORTERS[activeSort](a, b);
			return primary !== 0 ? primary : a.name.localeCompare(b.name);
		});
	}, [productsData, sort, category, saleOnly]);

	const { addItem } = useCart();

	const handleBuyNow = (product: Product) => {
		sessionStorage.setItem("shopScroll", window.scrollY.toString());
		navigate(itemPath(product.id));
	};

	const handleAddToCart = async (product: Product) => {
		await addItem({ productId: product.id }, 1);
		// openCart() intentionally removed here so the cart doesn't immediately interrupt the user!
	};

	return (
		<div className="relative min-h-screen bg-[#19191c]">
			<ShopSidebar
				sort={sort}
				onSortChange={setSort}
				category={category}
				onCategoryChange={setCategory}
				showSaleOnly={saleOnly}
				onSaleOnlyChange={setSaleOnly}
				isOpen={sidebarOpen}
				onToggle={() => setSidebarOpen((prev) => !prev)}
				navbarHidden={navbarHidden}
			/>

			<section
				aria-label="Products"
				className={[
					"relative z-30 flex-1 flex flex-col w-full min-h-screen bg-neutral-200 px-6 pb-20 md:px-8 transition-all duration-300 shadow-[0_-10px_30px_rgba(0,0,0,0.15)]",
					navbarHidden ? "pt-20" : "pt-[calc(var(--nav-h)+1.5rem)]",
					sidebarOpen
						? "md:ml-[280px] md:w-[calc(100%-280px)]"
						: "ml-0 w-full",
				].join(" ")}
			>
				{!sidebarOpen && (
					<div
						className={[
							"hidden md:flex sticky z-30 self-start mb-2 transition-all duration-300",
							navbarHidden
								? "top-4 mt-1"
								: "top-[calc(var(--nav-h)+12px)] mt-2",
						].join(" ")}
					>
						<button
							type="button"
							onClick={() => setSidebarOpen(true)}
							title="Show Filters"
							className="inline-flex items-center gap-1.5 bg-black text-white pl-2.5 pr-4 py-2 rounded-xl font-display font-black uppercase text-[10px] tracking-wider hover:bg-neutral-800 transition-colors shadow-md cursor-pointer border border-neutral-800"
						>
							<ChevronRight size={14} strokeWidth={3} />
							<span>
								FILTERS:{" "}
								<span className="text-neutral-400 font-bold ml-0.5">
									{activeFilterLabel}
								</span>
							</span>
						</button>
					</div>
				)}

				<div className={`${sidebarOpen ? "mt-4" : "mt-2"}`}>
					{loading ? (
						<LogoLoader />
					) : error ? (
						<div className="flex flex-col items-start gap-4">
							<p>Failed to load products: {error}</p>
							<PillButton
								onClick={() => window.location.reload()}
							>
								Try again
							</PillButton>
						</div>
					) : products.length > 0 ? (
						<ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-6 gap-y-8">
							{products.map((product) => (
								<li key={product.id}>
									<ShopItemCard
										imageSrc={product.imageSrc}
										name={product.name}
										price={product.price}
										salePrice={product.salePrice}
										rating={product.rating}
										reviewCount={product.reviewCount}
										soldCount={product.soldCount}
										stockLeft={product.stockLeft}
										badge={product.badge}
										href={itemPath(product.id)}
										onBuyNow={() => handleBuyNow(product)}
										onAddToCart={() =>
											handleAddToCart(product)
										}
									/>
								</li>
							))}
						</ul>
					) : (
						<div className="flex flex-col items-start gap-4">
							<p className="font-display text-xl font-extrabold [font-stretch:125%] text-black">
								No items match your filters.
							</p>
							<PillButton
								onClick={() => {
									setCategory(null);
									setSaleOnly(false);
								}}
							>
								Show all items
							</PillButton>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
