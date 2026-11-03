import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { ItemDetail as Item, Review } from "../api/items";
import { useCart } from "../context/cartContext";
import AngledButton from "../components/ui/AngledButton";
import ColorSwatches from "../components/item/ColorSwatches";
import PillButton from "../components/ui/PillButton";
import QuantityStepper from "../components/item/QuantityStepper";
import ReviewsSection from "../components/item/ReviewsSection";
import SizeSelector from "../components/item/SizeSelector";
import StarRating from "../components/ui/StarRating";
import { formatPrice } from "../helpers/priceFormat";
import { useItemDetail } from "../hooks/useItemDetail";
import { ROUTES } from "../routes";

const fieldLabel =
	"font-display text-[1.75rem] font-bold leading-none [font-stretch:62%]";

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

	// key resets the picked color / size / quantity when you move to a different item
	return (
		<ItemDetailView
			key={state.item.id}
			item={state.item}
			reviews={state.reviews}
		/>
	);
}

function ItemDetailView({ item, reviews }: { item: Item; reviews: Review[] }) {
	const [color, setColor] = useState(item.colors[0]?.name ?? "");
	const [size, setSize] = useState(
		item.sizes.find((s) => s.available)?.label ?? "",
	);
	const [quantity, setQuantity] = useState(1);

	const isOnSale = item.salePrice != null && item.salePrice < item.price;
	const outOfStock = item.stock <= 0;

	const { addItem, openCart, busy } = useCart();

	// The size is the variant: the backend finds (or creates) the row for this product + size.
	const handleAddToBag = async () => {
		if (!size) return;
		const ok = await addItem({ productId: item.id, size }, quantity);
		if (ok) openCart();
	};
	const handleBuyNow = handleAddToBag;

	return (
		<div className="bg-white">
			{/* First screen: everything down to the buttons. The reviews start below the fold. */}
			<section className="flex min-h-[calc(100svh-var(--nav-h))] items-center px-6 py-8 md:px-14">
				<div className="grid w-full gap-8 lg:grid-cols-[auto_1fr] lg:gap-14">
					<div className="mx-auto aspect-[710/981] w-full max-w-md overflow-hidden border-4 border-brand-red-dark bg-neutral-300 lg:mx-0 lg:w-[min(45vw,calc((100svh_-_var(--nav-h)_-_4rem)*0.7238))] lg:max-w-none">
						<img
							src={item.imageSrc}
							alt={item.name}
							className="size-full object-cover"
						/>
					</div>

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
									: `Stock: ${item.stock}`}
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
										{formatPrice(item.price)}
									</s>
								</>
							) : (
								<span className="text-[clamp(2.75rem,4.8vw,5.25rem)] leading-none">
									{formatPrice(item.price)}
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
								<ColorSwatches
									className="mt-1"
									colors={item.colors}
									value={color}
									onChange={setColor}
									labelledBy="item-colors-label"
								/>
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
									max={item.stock}
									labelledBy="item-quantity-label"
								/>
								<div className="flex flex-wrap gap-x-6 gap-y-4 lg:ml-auto lg:mr-14">
									<AngledButton
										variant="buyNow"
										className="w-full sm:w-56 xl:w-64"
										disabled={outOfStock || busy || !size}
										onClick={handleBuyNow}
									>
										Buy Now
									</AngledButton>
									<AngledButton
										variant="addToBag"
										className="w-full sm:w-56 xl:w-64"
										disabled={outOfStock || busy || !size}
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
