/* eslint-disable react-hooks/purity */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useCart } from "../context/cartContext";
import PillButton from "../components/ui/PillButton";
import ShopItemCard from "../components/shop/ShopItemCard";
import ShopSidebar from "../components/shop/ShopSidebar";
import { itemPath, ROUTES } from "../routes";
import {
	CATEGORIES,
	getProducts,
	type Category,
	type Product,
	type SortKey,
} from "../data/products";
import type { CartLine } from "../api/cart";

const effectivePrice = (p: Product) => p.salePrice ?? p.price;

const SORTERS: Record<SortKey, (a: Product, b: Product) => number> = {
	"best-selling": (a, b) => b.soldCount - a.soldCount,
	"name-asc": (a, b) => a.name.localeCompare(b.name),
	"name-desc": (a, b) => b.name.localeCompare(a.name),
	"price-asc": (a, b) => effectivePrice(a) - effectivePrice(b),
	"price-desc": (a, b) => effectivePrice(b) - effectivePrice(a),
};

export default function Shop() {
	const [productsData, setProductsData] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		getProducts()
			.then(setProductsData)
			.catch((err) => {
				setError(
					err instanceof Error
						? err.message
						: "Failed to load products",
				);
			})
			.finally(() => setLoading(false));
	}, []);

	const [sort, setSort] = useState<SortKey>("best-selling");

	// The category lives in the URL (/shop?filter=tops) so the nav dropdown can link straight to it.
	const [searchParams, setSearchParams] = useSearchParams();
	const categoryParam = searchParams.get("filter");
	const category: Category | null =
		CATEGORIES.find((c) => c.value === categoryParam)?.value ?? null;
	const setCategory = (next: Category | null) =>
		setSearchParams(next ? { filter: next } : {});

	const products = useMemo(() => {
		const filtered = category
			? productsData.filter((p) => p.categories.includes(category))
			: productsData;

		return [...filtered].sort(SORTERS[sort]);
	}, [productsData, sort, category]);

	const { addItem, openCart } = useCart();

	const handleBuyNow = (product: Product) => {
		const buyNowItem: CartLine = {
			id: "buynow-" + Date.now(),
			variantId: `var_${product.id}_S`,
			productId: product.id,
			name: product.name,
			imageUrl: product.imageSrc,
			unitPrice: product.salePrice ?? product.price,
			color: "Standard",
			size: "S",
			quantity: 1,
			stock: product.stockLeft ?? 99,
		};
		navigate(ROUTES.checkout, { state: { buyNowItems: [buyNowItem] } });
	};

	const handleAddToCart = async (product: Product) => {
		const ok = await addItem({ productId: product.id }, 1);
		if (ok) openCart();
	};

	return (
		<div>
			<div className="grid min-h-[calc(100vh-var(--nav-h))] md:grid-cols-[minmax(280px,32%)_1fr]">
				<ShopSidebar
					sort={sort}
					onSortChange={setSort}
					category={category}
					onCategoryChange={setCategory}
				/>

				<section
					aria-label="Products"
					className="bg-neutral-200 px-6 pb-16 pt-8 md:px-10"
				>
					{loading ? (
						<p>Loading products...</p>
					) : error ? (
						<div className="flex flex-col items-start gap-4 pt-16">
							<p>Failed to load products: {error}</p>
							<PillButton
								onClick={() => window.location.reload()}
							>
								Try again
							</PillButton>
						</div>
					) : products.length > 0 ? (
						<ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-6 gap-y-6">
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
										onBuyNow={() => handleBuyNow(product)}
										onAddToCart={() =>
											handleAddToCart(product)
										}
										href={itemPath(product.id)}
									/>
								</li>
							))}
						</ul>
					) : (
						<div className="flex flex-col items-start gap-4 pt-16">
							<p className="font-display text-xl font-extrabold [font-stretch:125%]">
								No items in this category yet.
							</p>
							<PillButton onClick={() => setCategory(null)}>
								Show all items
							</PillButton>
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
