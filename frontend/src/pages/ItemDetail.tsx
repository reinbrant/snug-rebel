import { createElement, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Box, Image as ImageIcon } from "lucide-react";
import type { ItemDetail as Item, Review } from "../api/items";
import { useCart } from "../context/cartContext";
import AngledButton from "../components/ui/AngledButton";
import PillButton from "../components/ui/PillButton";
import QuantityStepper from "../components/item/QuantityStepper";
import ReviewsSection from "../components/item/ReviewsSection";
import SizeSelector from "../components/item/SizeSelector";
import StarRating from "../components/ui/StarRating";
import { formatPrice } from "../helpers/priceFormat";
import { useItemDetail } from "../hooks/useItemDetail";
import { ROUTES } from "../routes";
import type { CartLine } from "../api/cart";

const fieldLabel =
	"font-display text-[1.75rem] font-bold leading-none [font-stretch:62%]";

const FALLBACK_DETAIL_IMAGE =
	"data:image/svg+xml," +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="710" height="981"><rect width="710" height="981" fill="#7a7a7a"/></svg>',
	);

/** Full view of one item: /shop/:itemId */
export default function ItemDetail() {
	const { itemId } = useParams();
	const state = useItemDetail(itemId);
	const navigate = useNavigate();

	if (state.status === "loading") {
		return (
			<div
				role="status"
				className="grid min-h-[calc(100svh-var(--nav-h))] place-items-center font-display text-xl font-extrabold [font-stretch:125%]"
			>
				Loading…
			</div>
		);
	}

	if (state.status !== "ready") {
		return (
			<div className="flex min-h-[calc(100svh-var(--nav-h))] flex-col items-center justify-center gap-4 px-6 text-center">
				<p className="font-display text-2xl font-extrabold [font-stretch:125%]">
					{state.status === "notFound"
						? "We couldn’t find that item."
						: "Something went wrong loading this item."}
				</p>
				<PillButton onClick={() => navigate(ROUTES.shop)}>
					Back to shop
				</PillButton>
			</div>
		);
	}

	// key resets the picked color / size / quantity / viewMode when you move to a different item
	return (
		<ItemDetailView
			key={state.item.id}
			item={state.item}
			reviews={state.reviews}
		/>
	);
}

function ItemDetailView({ item, reviews }: { item: Item; reviews: Review[] }) {
	const [size, setSize] = useState(
		item.sizes.find((s) => s.available)?.label ?? "",
	);
	const [quantity, setQuantity] = useState(1);
	const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
	const [imgSrc, setImgSrc] = useState(
		item.imageSrc?.trim() ? item.imageSrc : FALLBACK_DETAIL_IMAGE,
	);

	const navigate = useNavigate();

	const selectedVariant = item.variants?.find(
		(v) =>
			(!item.sizes.length || v.size === size)
	);
	const price = selectedVariant?.priceOverride ?? item.price;
	const stock =
		selectedVariant?.stock ?? (item.variants?.length ? 0 : item.stock);
	const isOnSale = item.salePrice != null && item.salePrice < price;
	const outOfStock = stock <= 0;
	const missingOptions = (item.sizes.length > 0 && !size);

	const { addItem, openCart, busy } = useCart();

	const handleAddToBag = async () => {
		if (missingOptions || outOfStock) return;
		const ok = await addItem(
			{
				productId: item.id,
				size: size || null,
				color: null,
				productVariantId: selectedVariant?.id,
			},
			quantity,
		);
		if (ok) openCart();
	};

	const handleBuyNow = () => {
		if (missingOptions || outOfStock) return;

		const buyNowItem: CartLine = {
			id: "buynow-" + Date.now(),
			variantId: selectedVariant?.id ?? item.id,
			productId: item.id,
			name: item.name,
			imageUrl: imgSrc,
			unitPrice: item.salePrice ?? price,
			color: null,
			size: size,
			quantity: quantity,
			stock,
		};

		navigate(ROUTES.checkout, { state: { buyNowItems: [buyNowItem] } });
	};

	return (
		<div className="bg-white">
			<section className="flex min-h-[calc(100svh-var(--nav-h))] items-center px-6 py-8 md:px-14">
				<div className="grid w-full gap-8 lg:grid-cols-[auto_1fr] lg:gap-14">
					<div className="mx-auto w-full max-w-md lg:mx-0 lg:w-[min(45vw,calc((100svh_-_var(--nav-h)_-_4rem)*0.7238))] lg:max-w-none">
						{/* Media Frame (Strict Aspect Ratio) */}
						<div className="relative aspect-[710/981] w-full overflow-hidden border-4 border-brand-red-dark bg-neutral-300">
							{/* Content Container */}
							{viewMode === "2d" ? (
								<img
									src={imgSrc}
									alt={item.name}
									onError={() =>
										setImgSrc(FALLBACK_DETAIL_IMAGE)
									}
									className="absolute inset-0 size-full object-cover"
								/>
							) : item.modelUrl ? (
								<div className="absolute inset-0 bg-neutral-900 text-white">
									{createElement("model-viewer", {
										src: item.modelUrl,
										poster: imgSrc,
										alt: `${item.name} 3D model`,
										"camera-controls": true,
										"auto-rotate": true,
										"shadow-intensity": "1",
										style: {
											width: "100%",
											height: "100%",
											backgroundColor: "#171717",
										},
									})}
								</div>
							) : (
								<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
									<Box
										size={40}
										className="text-neutral-600"
									/>
									<p className="font-display text-lg font-extrabold uppercase [font-stretch:115%]">
										No 3D (.glb) model uploaded for this
										product yet.
									</p>
									<PillButton
										onClick={() => setViewMode("2d")}
									>
										Back to 2D Image
									</PillButton>
								</div>
							)}

							{/* 2D / 3D Toggle Capsule (Absolute Bottom Right) */}
							<div
								role="group"
								aria-label="Toggle 2D or 3D product view"
								className="absolute bottom-4 right-4 z-10 inline-flex border-2 border-black bg-neutral-100 p-0.5 shadow-md"
							>
								<button
									type="button"
									aria-pressed={viewMode === "2d"}
									onClick={() => setViewMode("2d")}
									className={[
										"inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 font-display text-xs font-extrabold uppercase tracking-tight transition-colors [font-stretch:125%]",
										viewMode === "2d"
											? "bg-black text-white"
											: "bg-transparent text-black hover:bg-neutral-300",
									].join(" ")}
								>
									<ImageIcon size={14} aria-hidden="true" />
									2D
								</button>
								<button
									type="button"
									aria-pressed={viewMode === "3d"}
									onClick={() => setViewMode("3d")}
									className={[
										"inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 font-display text-xs font-extrabold uppercase tracking-tight transition-colors [font-stretch:125%]",
										viewMode === "3d"
											? "bg-brand-red text-white"
											: "bg-transparent text-black hover:bg-neutral-300",
									].join(" ")}
								>
									<Box size={14} aria-hidden="true" />
									3D
								</button>
							</div>
						</div>
					</div>

					{/* Product Info Section (Unchanged) */}
					<div className="flex min-w-0 flex-col justify-center gap-5">
						<div>
							<h1 className="font-display text-[clamp(2rem,3.6vw,4.25rem)] font-black leading-[1.1] tracking-tight [font-stretch:125%]">
								{item.name}
							</h1>

							<p className="mt-3 flex items-center gap-3 font-display text-[clamp(1rem,1.2vw,1.35rem)]">
								<StarRating value={item.rating} size={28} />
								<span>
									{item.rating.toFixed(1)} ({item.reviewCount}{" "}
									{item.reviewCount === 1
										? "review"
										: "reviews"}
									)
								</span>
							</p>

							<p className="mt-1 font-display text-xl font-bold text-neutral-500 [font-stretch:62%]">
								{outOfStock
									? "Out of stock"
									: `Stock: ${stock}`}
							</p>
						</div>

						<p className="flex flex-wrap items-baseline gap-x-5 font-display font-black tracking-tight [font-stretch:125%]">
							{isOnSale ? (
								<>
									<span className="text-[clamp(2.75rem,4.8vw,5.25rem)] leading-none text-brand-red">
										<span className="sr-only">
											Sale price{" "}
										</span>
										{formatPrice(item.salePrice!)}
									</span>
									<s className="text-[clamp(1.25rem,1.8vw,2rem)] decoration-4">
										<span className="sr-only">
											Original price{" "}
										</span>
										{formatPrice(price)}
									</s>
								</>
							) : (
								<span className="text-[clamp(2.75rem,4.8vw,5.25rem)] leading-none">
									{formatPrice(price)}
								</span>
							)}
						</p>

						<p className="font-display text-[clamp(1.05rem,1.6vw,1.6rem)] leading-snug">
							{item.description}
						</p>

						{item.colors.length > 0 && (
							<div>
								<p
									id="item-colors-label"
									className={fieldLabel}
								>
									Colors
								</p>
							</div>
						)}

						{item.sizes.length > 0 && (
							<div>
								<p id="item-size-label" className={fieldLabel}>
									Choose Size
								</p>
								<SizeSelector
									className="mt-1"
									sizes={item.sizes}
									value={size}
									onChange={setSize}
									labelledBy="item-size-label"
								/>
							</div>
						)}

						<div>
							<p id="item-quantity-label" className={fieldLabel}>
								Quantity
							</p>
							<div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-5 pl-1">
								<QuantityStepper
									value={quantity}
									onChange={setQuantity}
									max={stock}
									labelledBy="item-quantity-label"
								/>
								<div className="flex flex-wrap gap-x-6 gap-y-4 lg:ml-auto lg:mr-14">
									<AngledButton
										variant="buyNow"
										className="w-full sm:w-56 xl:w-64"
										disabled={
											outOfStock ||
											busy ||
											missingOptions ||
											quantity > stock
										}
										onClick={handleBuyNow}
									>
										Buy Now
									</AngledButton>
									<AngledButton
										variant="addToBag"
										className="w-full sm:w-56 xl:w-64"
										disabled={
											outOfStock ||
											busy ||
											missingOptions ||
											quantity > stock
										}
										onClick={handleAddToBag}
									>
										Add to Bag
									</AngledButton>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<ReviewsSection
				reviews={reviews}
				className="px-6 pb-20 pt-4 md:px-14"
			/>
		</div>
	);
}
