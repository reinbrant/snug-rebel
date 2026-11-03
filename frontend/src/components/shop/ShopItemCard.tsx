import { Star } from "lucide-react";
import { Link } from "react-router";
import AddToCartButton from "./AddToCartButton";
import ItemCardBadge, { type ItemBadgeVariant } from "./ItemCardBadge";
import PillButton from "../ui/PillButton";
import { formatCount, formatPrice } from "../../helpers/priceFormat";

type ShopItemCardProps = {
	imageSrc: string;
	name: string;
	price: number;
	salePrice?: number;
	rating: number;
	reviewCount: number;
	soldCount: number;
	/** Units left. Shown as a "5 remaining" tag on the image when the badge is "lowStock". */
	stockLeft?: number;
	/**
	 * Badge on the image. Defaults to "sale" when `salePrice` is set, otherwise "none".
	 * "outOfStock" also disables the buttons.
	 */
	badge?: ItemBadgeVariant;
	onBuyNow?: () => void;
	onAddToCart?: () => void;
	/** Item page URL. When set, the image and the name link to it. */
	href?: string;
	/** Sizing/positioning from the parent, e.g. "w-52". The card fills its container by default. */
	className?: string;
};

export default function ShopItemCard({
	imageSrc,
	name,
	price,
	salePrice,
	rating,
	reviewCount,
	soldCount,
	stockLeft,
	badge,
	onBuyNow,
	onAddToCart,
	href,
	className = "",
}: ShopItemCardProps) {
	const isOnSale = salePrice != null && salePrice < price;
	const discountPercent = isOnSale
		? Math.round(((price - salePrice) / price) * 100)
		: 0;
	const badgeVariant: ItemBadgeVariant =
		badge ?? (isOnSale ? "sale" : "none");
	const isUnavailable = badgeVariant === "outOfStock";
	const showStockTag = badgeVariant === "lowStock" && stockLeft !== undefined;

	return (
		<article className={["group relative w-full", className].join(" ")}>
			{/* Card background. Starts partway down the image, grows up to wrap it on hover. */}
			<div
				aria-hidden="true"
				className="absolute inset-x-0 bottom-0 top-14 transition-[top] duration-200 group-hover:-top-3 motion-reduce:transition-none"
			>
				{/* Black plate that tilts out from behind the card on hover */}
				<div className="absolute inset-0 origin-center bg-black opacity-0 transition duration-200 group-hover:rotate-2 group-hover:opacity-100 motion-reduce:transition-none" />
				<div className="absolute inset-0 bg-white shadow-[0_3px_8px_rgba(0,0,0,0.25)]" />
			</div>

			<div className="relative px-3 pb-3">
				<div className="relative aspect-square overflow-hidden bg-neutral-500">
					<img
						src={imageSrc}
						alt={name}
						className="size-full object-cover"
						loading="lazy"
					/>
					<ItemCardBadge
						variant={badgeVariant}
						className="absolute left-0 top-0"
					/>
					{showStockTag ? (
						<span className="absolute bottom-0 right-0 bg-orange-100/90 px-1 py-0.5 text-[9px] font-semibold leading-none text-brand-orange">
							{stockLeft} remaining
						</span>
					) : (
						isOnSale && (
							<span className="absolute bottom-0 right-0 bg-brand-red px-1 py-0.5 text-[9px] font-semibold leading-none text-white">
								-{discountPercent}%
							</span>
						)
					)}
					{href && (
						<Link
							to={href}
							aria-label={`View ${name}`}
							tabIndex={-1}
							className="absolute inset-0"
						/>
					)}
				</div>

				<div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5">
					<h3
						className="truncate font-display text-[13px] font-extrabold tracking-tight [font-stretch:125%]"
						title={name}
					>
						{href ? (
							<Link
								to={href}
								className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
							>
								{name}
							</Link>
						) : (
							name
						)}
					</h3>
					{isOnSale ? (
						<s className="text-right font-display text-[11px] font-extrabold tracking-tight [font-stretch:125%]">
							<span className="sr-only">Original price </span>
							{formatPrice(price)}
						</s>
					) : (
						<span />
					)}

					<p className="flex items-center gap-1 text-[10px] text-neutral-600">
						<Star
							size={12}
							className="shrink-0 fill-brand-orange text-brand-orange"
							aria-hidden="true"
						/>
						<span>
							{rating.toFixed(1)} ({formatCount(reviewCount)}{" "}
							{reviewCount === 1 ? "review" : "reviews"},{" "}
							{formatCount(soldCount)} sold)
						</span>
					</p>
					<p
						className={[
							"text-right font-display text-[15px] font-extrabold tracking-tight [font-stretch:125%]",
							isOnSale ? "text-brand-red" : "text-black",
						].join(" ")}
					>
						{isOnSale && (
							<span className="sr-only">Sale price </span>
						)}
						{formatPrice(isOnSale ? salePrice : price)}
					</p>
				</div>

				<div className="mt-3 flex items-center gap-2">
					<PillButton
						className="flex-1"
						onClick={onBuyNow}
						disabled={isUnavailable}
					>
						Buy now
					</PillButton>
					<AddToCartButton
						label={`Add ${name} to cart`}
						onClick={onAddToCart}
						disabled={isUnavailable}
					/>
				</div>
			</div>
		</article>
	);
}

/*
Usage:

<ShopItemCard
    className="w-52"
    imageSrc="/items/shirt.jpg"
    name="Item name"
    price={500}
    salePrice={250}
    rating={5}
    reviewCount={10}
    soldCount={20}
    badge="sale"            // optional: 'new' | 'sale' | 'lowStock' | 'outOfStock' | 'none'
    onBuyNow={() => {}}
    onAddToCart={() => {}}
/>
*/
