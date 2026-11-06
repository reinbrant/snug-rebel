/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router";
import { getProducts, CATEGORIES, type Product } from "../../data/products";
import { itemPath } from "../../routes";
import { formatPrice } from "../../helpers/priceFormat";

type SearchOverlayProps = {
	isOpen: boolean;
	onClose: () => void;
};

// Map slug/value to human-readable label
const categoryLabelMap = new Map(CATEGORIES.map((c) => [c.value, c.label]));

function getCategoryDisplayName(categories: string[]): string {
	// Find the first valid category that isn't an internal tag like "best-selling" or a raw ID hash
	const cleanCat = categories.find(
		(c) => c && c !== "best-selling" && !c.startsWith("ctg"),
	);
	if (!cleanCat) return "Tops";

	const lower = cleanCat.toLowerCase();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return categoryLabelMap.get(lower as any) || cleanCat.toUpperCase();
}

// Fuzzy or substring match helper
function fuzzyMatch(query: string, text: string): boolean {
	const q = query.toLowerCase().trim();
	const t = text.toLowerCase();
	if (t.includes(q)) return true;

	let qi = 0;
	for (let ti = 0; ti < t.length; ti++) {
		if (t[ti] === q[qi]) {
			qi++;
			if (qi === q.length) return true;
		}
	}
	return false;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
	const [query, setQuery] = useState("");
	const [products, setProducts] = useState<Product[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();

	useEffect(() => {
		if (isOpen) {
			inputRef.current?.focus();
			getProducts()
				.then(setProducts)
				.catch(() => setProducts([]));
		} else {
			setQuery("");
		}
	}, [isOpen]);

	if (!isOpen) return null;

	const results = query.trim()
		? products.filter(
				(p) =>
					fuzzyMatch(query, p.name) ||
					p.categories.some((c) => fuzzyMatch(query, c)),
			)
		: [];

	return (
		<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col pt-24 px-4 sm:px-8 animate-fadeIn font-display">
			<div className="max-w-3xl w-full mx-auto relative flex flex-col gap-6">
				{/* Search Input Bar */}
				<div className="relative flex items-center bg-white rounded-2xl px-6 py-4 shadow-2xl border-2 border-black">
					<Search
						size={24}
						className="text-neutral-400 shrink-0 mr-4"
					/>
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search by product name or category (e.g. tee, outerwear)..."
						className="w-full bg-transparent outline-none text-lg lg:text-xl font-bold text-black placeholder-neutral-400"
					/>
					<button
						type="button"
						onClick={onClose}
						className="p-2 hover:bg-neutral-100 rounded-full transition-colors ml-2 text-black cursor-pointer"
						aria-label="Close search"
					>
						<X size={24} />
					</button>
				</div>

				{/* Results Dropdown List */}
				{query.trim() && (
					<div className="bg-white rounded-2xl shadow-2xl border-2 border-black overflow-hidden max-h-[60vh] overflow-y-auto">
						{results.length > 0 ? (
							<ul className="divide-y divide-neutral-100">
								{results.map((product) => {
									const categoryName = getCategoryDisplayName(
										product.categories,
									);
									return (
										<li key={product.id}>
											<button
												type="button"
												onClick={() => {
													navigate(
														itemPath(product.id),
													);
													onClose();
												}}
												className="w-full flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors text-left group cursor-pointer"
											>
												<img
													src={product.imageSrc}
													alt={product.name}
													className="size-16 object-cover rounded-xl bg-neutral-200 shrink-0 border border-neutral-300"
												/>
												<div className="flex-1 min-w-0">
													<h4 className="font-extrabold text-black text-base truncate group-hover:text-brand-red transition-colors">
														{product.name}
													</h4>
													<p className="text-xs text-neutral-500 uppercase tracking-wider font-bold mt-0.5">
														{categoryName}
													</p>
												</div>
												<div className="text-right font-extrabold text-black text-base">
													{formatPrice(
														product.salePrice ??
															product.price,
													)}
												</div>
											</button>
										</li>
									);
								})}
							</ul>
						) : (
							<div className="p-8 text-center text-neutral-500 font-bold">
								No items found matching "{query}".
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
