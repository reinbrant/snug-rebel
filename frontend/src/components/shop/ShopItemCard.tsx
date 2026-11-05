/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Link } from "react-router";
import AddToCartButton from "./AddToCartButton";
import ItemCardBadge, { type ItemBadgeVariant } from "./ItemCardBadge";
import PillButton from "../ui/PillButton";
import { formatCount, formatPrice } from "../../helpers/priceFormat";

const FALLBACK_THUMBNAIL =
	"data:image/svg+xml," +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#7a7a7a"/></svg>',
	);

type ShopItemCardProps = {
	imageSrc: string;
	name: string;
	price: number;
	salePrice?: number;
	rating: number;
	reviewCount: number;
	soldCount: number;
	stockLeft?: number;
	badge?: ItemBadgeVariant;
	onBuyNow?: () => void;
	onAddToCart?: () => void;
	href?: string;
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
	const [currentImgSrc, setCurrentImgSrc] = useState(
		imageSrc?.trim() ? imageSrc : FALLBACK_THUMBNAIL,
	);

	useEffect(() => {
		setCurrentImgSrc(imageSrc?.trim() ? imageSrc : FALLBACK_THUMBNAIL);
	}, [imageSrc]);

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
			<div
				aria-hidden="true"
				className="absolute inset-x-0 bottom-0 top-14 transition-[top] duration-200 group-hover:-top-3 motion-reduce:transition-none"
			>
				<div className="absolute inset-0 origin-center bg-black opacity-0 transition duration-200 group-hover:rotate-2 group-hover:opacity-100 motion-reduce:transition-none" />
				<div className="absolute inset-0 bg-white shadow-[0_3px_8px_rgba(0,0,0,0.25)]" />
			</div>

			<div className="relative px-3 pb-3">
				<div className="relative aspect-square overflow-hidden bg-neutral-500">
					<img
						src={currentImgSrc}
						alt={name}
						onError={() => setCurrentImgSrc(FALLBACK_THUMBNAIL)}
						className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
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
